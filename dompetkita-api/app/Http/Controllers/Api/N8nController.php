<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HouseholdUser;
use App\Models\Transaction;
use App\Models\Wallet;
use App\Services\AiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Machine-to-machine endpoints for n8n (token-authenticated via N8nApiToken).
 *
 * Typical flow (WhatsApp bot -> n8n -> DompetKita):
 *   1. wabot forwards a chat message to an n8n workflow.
 *   2. n8n calls POST /api/n8n/parse-text to turn the message into structured JSON (AI).
 *   3. n8n calls POST /api/n8n/households/{id}/transactions to record it.
 */
class N8nController extends Controller
{
    public function ping(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'pong',
            'service' => 'dompetkita-n8n',
            'time' => now()->toIso8601String(),
        ]);
    }

    public function wallets(Request $request, $householdId): JsonResponse
    {
        $wallets = Wallet::where('household_id', $householdId)
            ->get(['id', 'name', 'type', 'balance']);

        return response()->json(['success' => true, 'data' => $wallets]);
    }

    public function summary(Request $request, $householdId): JsonResponse
    {
        $now = now();

        $totalBalance = (float) Wallet::where('household_id', $householdId)->sum('balance');
        $monthlyExpense = (float) Transaction::where('household_id', $householdId)
            ->where('type', 'expense')
            ->whereMonth('transaction_date', $now->month)
            ->whereYear('transaction_date', $now->year)
            ->sum('amount');
        $monthlyIncome = (float) Transaction::where('household_id', $householdId)
            ->where('type', 'income')
            ->whereMonth('transaction_date', $now->month)
            ->whereYear('transaction_date', $now->year)
            ->sum('amount');

        return response()->json(['success' => true, 'data' => [
            'total_balance' => $totalBalance,
            'monthly_income' => $monthlyIncome,
            'monthly_expense' => $monthlyExpense,
            'month' => $now->format('Y-m'),
        ]]);
    }

    /**
     * Create a transaction from an external caller (e.g. n8n / WhatsApp bot).
     * Atomic wallet balance handling identical to the normal endpoint.
     */
    public function createTransaction(Request $request, $householdId): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:income,expense,transfer',
            'amount' => 'required|numeric|min:0.01',
            'admin_fee' => 'nullable|numeric|min:0',
            'wallet_id' => 'required|exists:wallets,id',
            'to_wallet_id' => 'nullable|required_if:type,transfer|exists:wallets,id',
            'category_id' => 'nullable|exists:categories,id',
            'description' => 'nullable|string',
            'transaction_date' => 'nullable|date',
            'user_id' => 'nullable|exists:users,id',
        ]);

        // Resolve the acting user (transactions.user_id is required).
        $userId = $validated['user_id'] ?? null;
        if ($userId) {
            $isMember = HouseholdUser::where('household_id', $householdId)
                ->where('user_id', $userId)->exists();
            if (!$isMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'user_id bukan anggota household ini.',
                ], 422);
            }
        } else {
            $userId = HouseholdUser::where('household_id', $householdId)->value('user_id');
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Household tidak memiliki anggota.',
                ], 422);
            }
        }

        try {
            $transaction = DB::transaction(function () use ($validated, $householdId, $userId) {
                $adminFee = (float) ($validated['admin_fee'] ?? 0);

                $wallet = Wallet::where('id', $validated['wallet_id'])
                    ->where('household_id', $householdId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($validated['type'] === 'expense') {
                    $wallet->balance -= $validated['amount'];
                    $wallet->save();
                } elseif ($validated['type'] === 'income') {
                    $wallet->balance += $validated['amount'];
                    $wallet->save();
                } elseif ($validated['type'] === 'transfer') {
                    $toWallet = Wallet::where('id', $validated['to_wallet_id'])
                        ->where('household_id', $householdId)
                        ->lockForUpdate()
                        ->firstOrFail();
                    $wallet->balance -= ($validated['amount'] + $adminFee);
                    $wallet->save();
                    $toWallet->balance += $validated['amount'];
                    $toWallet->save();
                }

                return Transaction::create([
                    'household_id' => $householdId,
                    'user_id' => $userId,
                    'type' => $validated['type'],
                    'amount' => $validated['amount'],
                    'admin_fee' => $adminFee,
                    'wallet_id' => $validated['wallet_id'],
                    'to_wallet_id' => $validated['to_wallet_id'] ?? null,
                    'category_id' => $validated['category_id'] ?? null,
                    'description' => $validated['description'] ?? '(via n8n)',
                    'transaction_date' => $validated['transaction_date'] ?? now(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Transaksi tercatat.',
                'data' => $transaction,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat transaksi: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Turn free-form text (e.g. a WhatsApp message or bank email) into a
     * structured transaction object using the configured AI provider.
     */
    public function parseText(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text' => 'required|string',
        ]);

        $ai = AiClient::fromRequest($request);
        if (!$ai->hasKey()) {
            return response()->json([
                'success' => false,
                'message' => 'AI API key belum dikonfigurasi.',
            ], 500);
        }

        $text = $validated['text'];
        $today = now()->toDateString();
        $prompt = <<<PROMPT
Kamu adalah asisten keuangan yang mengekstrak transaksi dari pesan singkat (chat WhatsApp) atau notifikasi bank Indonesia.

Balas HANYA dengan JSON mentah (tanpa markdown, tanpa backtick):

{
  "is_transaction": true,
  "type": "expense",
  "amount": 150000,
  "merchant": "Indomaret",
  "description": "Belanja di Indomaret",
  "transaction_date": "{$today}",
  "currency": "IDR"
}

Aturan:
- "is_transaction": true jika pesan berisi transaksi keuangan yang jelas, false jika tidak.
- "type": "expense" jika uang keluar, "income" jika uang masuk.
- "amount": nominal sebagai angka murni tanpa simbol/titik/koma.
- "merchant": nama toko/penerima/pengirim jika ada, atau null.
- "description": ringkasan singkat Bahasa Indonesia (maks 60 karakter).
- "transaction_date": format YYYY-MM-DD, gunakan {$today} jika tidak disebut.
- "currency": selalu "IDR" kecuali jelas lain.

Pesan yang dianalisis:
---
{$text}
---
PROMPT;

        try {
            $parsed = $ai->textJson($prompt);
            return response()->json([
                'success' => true,
                'provider' => $ai->provider(),
                'data' => $parsed,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }
    }
}
