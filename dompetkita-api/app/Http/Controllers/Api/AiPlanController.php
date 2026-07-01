<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Category;
use App\Models\HouseholdUser;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * AI narrative planner.
 *
 * The user pastes a free-form family finance summary ("Ringkasan Keuangan
 * Keluarga") and OpenAI turns it into a concrete setup plan: wallets (with
 * starting balances), categories, monthly budgets, and immediate
 * transactions. The plan is then executed server-side in a single DB
 * transaction so the whole household is configured in one shot.
 */
class AiPlanController extends Controller
{
    public function planAndExecute(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'text' => 'required|string|max:8000',
        ]);

        $apiKey = config('services.openai.key');
        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'Fitur AI belum aktif. Set OPENAI_API_KEY di backend .env.',
            ], 500);
        }

        $existingWallets = Wallet::where('household_id', $householdId)->pluck('name')->implode(', ') ?: '(none)';
        $existingCats = Category::where('household_id', $householdId)->pluck('name')->implode(', ') ?: '(none)';
        $today = now()->toDateString();
        $userText = $request->input('text');

        $prompt = <<<PROMPT
You are a financial setup assistant for an Indonesian family finance app. Read the family's financial summary (narrative) and turn it into a concrete setup plan as a single JSON object (no markdown, no backticks):
{
  "wallets": [ { "name": "Gaji Anggy", "type": "bank", "balance": 13000000, "note": "optional" } ],
  "categories": [ { "name": "Listrik", "type": "expense" } ],
  "budgets": [ { "category_name": "Listrik", "amount": 500000, "period": "monthly" } ],
  "transactions": [ { "type": "expense", "amount": 5000000, "wallet_name": "Dana Syuraih", "category_name": "Biaya Sekolah", "description": "Naik kelas Syuraih", "transaction_date": "{$today}" } ],
  "summary": "ringkasan singkat dalam Bahasa Indonesia tentang apa yang dibuat",
  "notes": [ "prinsip / catatan penting dari narasi" ]
}

Rules:
- Understand Indonesian money format: "Rp13.000.000" = 13000000, "500rb" = 500000, "1,2jt" = 1200000. Return numbers as plain integers.
- WALLETS: create one wallet for each real pool of money. "type" must be exactly one of: bank, cash, e-wallet (default cash). "balance" is the current amount owned. Separated children funds ("dana anak") each become their own wallet, e.g. "Dana Hamzah", "Dana Syuraih", "Dana Nuha", so they stay isolated from operational money. If a child's fund is split across people, sum it into one wallet and mention the split in "note".
- CATEGORIES: one per distinct income/expense item. "type" is "income" or "expense" only. Salary => income ("Gaji"). Everything else in routine/optional/school => expense. Add a "Biaya Sekolah" expense category if school fees exist.
- BUDGETS: for every RECURRING monthly item (routine + optional), add a monthly budget with the category_name and monthly amount. "period" is one of daily, weekly, monthly, yearly, once (use "monthly" for bulanan). Do NOT create budgets for one-off items.
- TRANSACTIONS: only include ACTUAL/immediate events that happen now, e.g. paying school fees from a specific fund. Set wallet_name to the source wallet. Do NOT create transactions for the wallet starting balances (those are already set via "balance"). Do NOT create transactions for future recurring expenses (those are budgets only). transaction_date defaults to {$today}.
- Reuse existing names when they clearly match. Existing wallets: [{$existingWallets}]. Existing categories: [{$existingCats}].
- "summary": 2-4 kalimat. "notes": pindahkan prinsip pengelolaan (dana anak dipisah, prioritas sisa gaji, dll) ke sini.

Narrative:
---
{$userText}
---
PROMPT;

        try {
            $model = config('services.openai.model', 'gpt-4o-mini');
            $response = Http::timeout(60)
                ->withToken($apiKey)
                ->acceptJson()
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'temperature' => 0.1,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => 'You convert a family finance narrative into a structured setup plan as a single valid JSON object.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            if (!$response->successful()) {
                info('OpenAI plan error: ' . $response->body());
                return response()->json(['success' => false, 'message' => 'AI gagal menyusun rencana.'], 502);
            }

            $content = $response->json()['choices'][0]['message']['content'] ?? '{}';
            $content = str_replace(['```json', '```'], '', $content);
            $plan = json_decode(trim($content), true);

            if (json_last_error() !== JSON_ERROR_NONE || !is_array($plan)) {
                return response()->json(['success' => false, 'message' => 'AI mengembalikan rencana tidak valid.', 'raw' => $content], 500);
            }

            $created = $this->execute($householdId, $request->user()->id, $plan);

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $plan['summary'] ?? null,
                    'notes' => is_array($plan['notes'] ?? null) ? $plan['notes'] : [],
                    'created' => $created,
                ],
            ]);
        } catch (\Exception $e) {
            info('AiPlanController: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan saat menjalankan rencana: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Execute the AI plan idempotently inside one DB transaction.
     * Existing wallets/categories (by name) are reused, never overwritten.
     */
    private function execute($householdId, $userId, array $plan): array
    {
        $created = ['wallets' => [], 'categories' => [], 'budgets' => [], 'transactions' => [], 'skipped' => []];

        DB::transaction(function () use ($householdId, $userId, $plan, &$created) {
            // 1) Categories
            foreach (($plan['categories'] ?? []) as $c) {
                $name = trim($c['name'] ?? '');
                if ($name === '') continue;
                $type = in_array(($c['type'] ?? 'expense'), ['income', 'expense'], true) ? $c['type'] : 'expense';
                $existing = Category::where('household_id', $householdId)
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                    ->where('type', $type)->first();
                if (!$existing) {
                    Category::create(['household_id' => $householdId, 'name' => $name, 'type' => $type]);
                    $created['categories'][] = "{$name} ({$type})";
                }
            }

            // Reload lookup maps
            $cats = Category::where('household_id', $householdId)->get();
            $findCat = function ($name, $type = null) use ($cats) {
                if (!$name) return null;
                $n = mb_strtolower(trim($name));
                foreach ($cats as $c) {
                    if (mb_strtolower(trim($c->name)) === $n && (!$type || $c->type === $type)) return $c;
                }
                foreach ($cats as $c) {
                    if (mb_strtolower(trim($c->name)) === $n) return $c;
                }
                return null;
            };

            // 2) Wallets
            foreach (($plan['wallets'] ?? []) as $w) {
                $name = trim($w['name'] ?? '');
                if ($name === '') continue;
                $type = in_array(($w['type'] ?? 'cash'), ['bank', 'cash', 'e-wallet'], true) ? $w['type'] : 'cash';
                $balance = is_numeric($w['balance'] ?? null) ? (float) $w['balance'] : 0;
                $existing = Wallet::where('household_id', $householdId)
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();
                if (!$existing) {
                    Wallet::create([
                        'household_id' => $householdId,
                        'user_id' => null,
                        'name' => $name,
                        'type' => $type,
                        'balance' => $balance,
                    ]);
                    $created['wallets'][] = $name . ' (Rp ' . number_format($balance, 0, ',', '.') . ')';
                }
            }

            $wallets = Wallet::where('household_id', $householdId)->get();
            $findWallet = function ($name) use ($wallets) {
                if (!$name) return null;
                $n = mb_strtolower(trim($name));
                foreach ($wallets as $w) {
                    if (mb_strtolower(trim($w->name)) === $n) return $w;
                }
                foreach ($wallets as $w) {
                    $hay = mb_strtolower(trim($w->name));
                    if ($hay !== '' && (str_contains($hay, $n) || str_contains($n, $hay))) return $w;
                }
                return null;
            };

            // 3) Budgets (upsert by category)
            foreach (($plan['budgets'] ?? []) as $b) {
                $cat = $findCat($b['category_name'] ?? null, 'expense');
                $amount = is_numeric($b['amount'] ?? null) ? (float) $b['amount'] : null;
                if (!$cat || $amount === null) continue;
                $period = in_array(($b['period'] ?? 'monthly'), ['daily', 'weekly', 'monthly', 'yearly', 'once'], true) ? $b['period'] : 'monthly';
                Budget::updateOrCreate(
                    ['household_id' => $householdId, 'category_id' => $cat->id],
                    ['amount' => $amount, 'period' => $period, 'start_date' => now()->startOfMonth()->toDateString()]
                );
                $created['budgets'][] = $cat->name . ': Rp ' . number_format($amount, 0, ',', '.') . '/' . $period;
            }

            // 4) Transactions (apply and adjust wallet balances)
            foreach (($plan['transactions'] ?? []) as $t) {
                $type = in_array(($t['type'] ?? null), ['income', 'expense', 'transfer'], true) ? $t['type'] : null;
                $amount = is_numeric($t['amount'] ?? null) ? (float) $t['amount'] : null;
                if (!$type || !$amount || $amount <= 0) continue;

                $wallet = $findWallet($t['wallet_name'] ?? null);
                if (!$wallet) { $created['skipped'][] = 'Transaksi dilewati (dompet tidak ditemukan): ' . ($t['description'] ?? ''); continue; }

                $adminFee = is_numeric($t['admin_fee'] ?? null) ? (float) $t['admin_fee'] : 0;
                $cat = $type === 'transfer' ? null : $findCat($t['category_name'] ?? null, $type);
                $toWallet = $type === 'transfer' ? $findWallet($t['to_wallet_name'] ?? null) : null;
                if ($type === 'transfer' && !$toWallet) { $created['skipped'][] = 'Transfer dilewati (dompet tujuan tidak ada): ' . ($t['description'] ?? ''); continue; }

                $lockedSource = Wallet::where('id', $wallet->id)->lockForUpdate()->first();
                if ($type === 'income') {
                    $lockedSource->balance += $amount;
                } elseif ($type === 'expense') {
                    $lockedSource->balance -= $amount;
                } else {
                    $lockedSource->balance -= ($amount + $adminFee);
                }
                $lockedSource->save();

                if ($type === 'transfer') {
                    $lockedDest = Wallet::where('id', $toWallet->id)->lockForUpdate()->first();
                    $lockedDest->balance += $amount;
                    $lockedDest->save();
                }

                Transaction::create([
                    'household_id' => $householdId,
                    'user_id' => $userId,
                    'type' => $type,
                    'amount' => $amount,
                    'admin_fee' => $adminFee,
                    'wallet_id' => $wallet->id,
                    'to_wallet_id' => $toWallet->id ?? null,
                    'category_id' => $cat->id ?? null,
                    'description' => $t['description'] ?? null,
                    'transaction_date' => $t['transaction_date'] ?? now()->toDateString(),
                ]);
                $created['transactions'][] = ucfirst($type) . ' Rp ' . number_format($amount, 0, ',', '.') . ' — ' . ($t['description'] ?? '');
            }
        });

        return $created;
    }

    private function authorizeHousehold($userId, $householdId): void
    {
        $exists = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $userId)
            ->exists();

        if (!$exists) {
            abort(403, 'You do not belong to this household.');
        }
    }
}
