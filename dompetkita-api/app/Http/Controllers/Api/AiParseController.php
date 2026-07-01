<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\HouseholdUser;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * AI-assisted transaction input from free text.
 *
 * The user types something like "jajan bakso 25rb pakai cash tadi siang"
 * and OpenAI turns it into a structured transaction draft that the
 * frontend uses to pre-fill the New Transaction form.
 */
class AiParseController extends Controller
{
    public function parseTransaction(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'text' => 'required|string|max:1000',
        ]);

        $apiKey = config('services.openai.key');
        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'Fitur AI belum aktif. Set OPENAI_API_KEY di backend .env.',
            ], 500);
        }

        // Context: wallets & categories of this household so the AI can map names.
        $wallets = Wallet::where('household_id', $householdId)->get(['id', 'name', 'type']);
        $categories = Category::where('household_id', $householdId)->get(['id', 'name', 'type']);

        $walletList = $wallets->pluck('name')->implode(', ') ?: '(none)';
        $expenseCats = $categories->where('type', 'expense')->pluck('name')->implode(', ') ?: '(none)';
        $incomeCats = $categories->where('type', 'income')->pluck('name')->implode(', ') ?: '(none)';
        $today = now()->toDateString();

        $userText = $request->input('text');

        $prompt = <<<PROMPT
You are a financial assistant for an Indonesian family finance app. Convert the user's free text into ONE transaction.
Respond ONLY with a raw JSON object (no markdown, no backticks, no comments) matching this exact schema:
{
  "type": "expense|income|transfer",
  "amount": 150000,
  "category_name": "exact category name from the list, or null",
  "wallet_name": "exact wallet name from the list, or null",
  "to_wallet_name": "exact wallet name for transfer destination, or null",
  "description": "short human description",
  "transaction_date": "YYYY-MM-DD",
  "confidence": 0.0
}

Rules:
- Understand Indonesian shorthand for money: "25rb"/"25k" = 25000, "1.5jt"/"1,5 juta" = 1500000, "350ribu" = 350000. Return "amount" as a plain integer (no separators/symbols).
- Infer "type": money spent = expense, money received/salary = income, moving between own wallets = transfer.
- Pick "wallet_name" ONLY from this list: [{$walletList}]. If the user names a payment method not in the list, pick the closest match, else null.
- For transfer, set both "wallet_name" (source) and "to_wallet_name" (destination) from the list.
- Pick "category_name" ONLY from the matching list. Expense categories: [{$expenseCats}]. Income categories: [{$incomeCats}]. If nothing fits, return null. For transfer, category_name must be null.
- "transaction_date": resolve relative dates ("tadi", "kemarin", "tanggal 3") relative to today ({$today}). Default to {$today} if unclear.
- "confidence": 0..1 how sure you are this is a valid transaction.

User text: "{$userText}"
PROMPT;

        try {
            $model = config('services.openai.model', 'gpt-4o-mini');
            $response = Http::timeout(30)
                ->withToken($apiKey)
                ->acceptJson()
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'temperature' => 0.1,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => 'You extract structured JSON transactions for an Indonesian family finance app. Always reply with a single valid JSON object.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            if (!$response->successful()) {
                info('OpenAI parse-text error: ' . $response->body());
                return response()->json(['success' => false, 'message' => 'AI gagal memproses teks.'], 502);
            }

            $result = $response->json();
            $text = $result['choices'][0]['message']['content'] ?? '{}';
            $text = str_replace(['```json', '```'], '', $text);
            $parsed = json_decode(trim($text), true);

            if (json_last_error() !== JSON_ERROR_NONE || !is_array($parsed)) {
                return response()->json(['success' => false, 'message' => 'AI mengembalikan data tidak valid.', 'raw' => $text], 500);
            }

            $type = in_array(($parsed['type'] ?? null), ['income', 'expense', 'transfer'], true)
                ? $parsed['type'] : 'expense';

            // Resolve wallet & category names back to IDs (case-insensitive).
            $walletId = $this->matchId($wallets, $parsed['wallet_name'] ?? null);
            $toWalletId = $this->matchId($wallets, $parsed['to_wallet_name'] ?? null);
            $categoryId = null;
            if ($type !== 'transfer') {
                $pool = $categories->where('type', $type);
                $categoryId = $this->matchId($pool, $parsed['category_name'] ?? null);
            }

            $amount = is_numeric($parsed['amount'] ?? null) ? (float) $parsed['amount'] : null;
            $date = $parsed['transaction_date'] ?? $today;

            return response()->json([
                'success' => true,
                'data' => [
                    'type' => $type,
                    'amount' => $amount,
                    'category_id' => $categoryId,
                    'category_name' => $parsed['category_name'] ?? null,
                    'wallet_id' => $walletId,
                    'to_wallet_id' => $toWalletId,
                    'description' => $parsed['description'] ?? $userText,
                    'transaction_date' => $date,
                    'confidence' => $parsed['confidence'] ?? null,
                ],
            ]);
        } catch (\Exception $e) {
            info('AiParseController: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan saat memproses teks.'], 500);
        }
    }

    /**
     * Case-insensitive best match of a name against a collection of models
     * that have `id` and `name`. Returns the matched id or null.
     */
    private function matchId($collection, $name)
    {
        if (!$name) {
            return null;
        }
        $needle = mb_strtolower(trim($name));

        // Exact (case-insensitive) match first.
        foreach ($collection as $item) {
            if (mb_strtolower(trim($item->name)) === $needle) {
                return $item->id;
            }
        }
        // Fallback: partial contains match.
        foreach ($collection as $item) {
            $hay = mb_strtolower(trim($item->name));
            if ($hay !== '' && (str_contains($hay, $needle) || str_contains($needle, $hay))) {
                return $item->id;
            }
        }
        return null;
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
