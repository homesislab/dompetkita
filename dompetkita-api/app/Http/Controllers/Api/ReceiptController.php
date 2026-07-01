<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ReceiptController extends Controller
{
    public function scan(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // 10MB Max
        ]);

        // Read the OpenAI key from server-side config only. It must never be sent
        // from (or exposed to) the browser.
        $apiKey = config('services.openai.key');
        if (!$apiKey) {
            return response()->json(['message' => 'OpenAI API key is not configured. Set OPENAI_API_KEY in the backend .env file.'], 500);
        }

        try {
            $imagePath = $request->file('image')->getRealPath();
            $mimeType  = $request->file('image')->getMimeType();
            $base64Data = base64_encode(file_get_contents($imagePath));

            $householdId = $request->input('household_id');
            $categoryList = 'Unknown';
            if ($householdId) {
                // Fetch expense categories for context
                $cats = \App\Models\Category::where('household_id', $householdId)
                                            ->where('type', 'expense')
                                            ->pluck('name')->toArray();
                if (count($cats) > 0) {
                    $categoryList = implode(', ', $cats);
                }
            }

            $prompt = <<<PROMPT
Analyze this receipt image and extract all details. Respond ONLY with a raw JSON object (no markdown, no backticks, no comments) matching this exact schema:
{
  "store_name": "Nama Toko",
  "purchase_date": "YYYY-MM-DD",
  "total_amount": 150000,
  "description": "Nama Toko - ringkasan singkat",
  "predicted_category_name": "Nama Kategori",
  "items": [
    { "name": "Nama Item Lengkap", "quantity": 1, "unit": "pcs", "unit_price": 10000, "total_price": 10000 }
  ]
}

Rules:
- "store_name": merchant/store name from the receipt
- "purchase_date": use the receipt date, or today if not found (format YYYY-MM-DD)
- "total_amount": the grand total as a number (strip currency symbols and commas)
- "description": short summary like "Indomaret - 5 items"
- "predicted_category_name": The single most appropriate category for this receipt out of the following valid list: [{$categoryList}]. If none matches well, return null.
- "items": ALL line items on the receipt. For each item:
  - "name": product name exactly as printed
  - "quantity": numeric quantity (e.g. 2, 0.5)
  - "unit": unit of measure (pcs, kg, ltr, etc.) or null if not shown
  - "unit_price": price per unit
  - "total_price": total for this line item
If you cannot identify individual items, return "items" as an empty array [].
PROMPT;

            $model = config('services.openai.model', 'gpt-4o-mini');
            $response = Http::timeout(60)
                ->withToken($apiKey)
                ->acceptJson()
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'temperature' => 0.1,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a receipt OCR and extraction assistant. Always reply with a single valid JSON object.',
                        ],
                        [
                            'role' => 'user',
                            'content' => [
                                ['type' => 'text', 'text' => $prompt],
                                [
                                    'type' => 'image_url',
                                    'image_url' => [
                                        'url' => "data:{$mimeType};base64,{$base64Data}",
                                    ],
                                ],
                            ],
                        ],
                    ],
                ]);

            if (!$response->successful()) {
                info('OpenAI API Error: ' . $response->body());
                return response()->json(['message' => 'Failed to process receipt with AI'], 502);
            }

            // Save the image
            $fileName = time() . '_' . $request->file('image')->getClientOriginalName();
            $path = $request->file('image')->storeAs('receipts', $fileName, 'public');
            $publicUrl = '/storage/' . $path;

            $result = $response->json();
            $text   = $result['choices'][0]['message']['content'] ?? '{}';

            // Clean markdown if accidentally returned
            $text   = str_replace(['```json', '```'], '', $text);
            $parsed = json_decode(trim($text), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json(['message' => 'AI returned malformed data', 'raw' => $text], 500);
            }

            // Ensure items key always exists
            if (!isset($parsed['items'])) {
                $parsed['items'] = [];
            }

            // Ensure required fields
            $parsed['amount'] = $parsed['total_amount'] ?? $parsed['amount'] ?? 0;
            $parsed['image_path'] = $publicUrl; // Return the path to the frontend

            return response()->json($parsed);

        } catch (\Exception $e) {
            info($e->getMessage());
            return response()->json(['message' => 'An error occurred while scanning the receipt'], 500);
        }
    }
}
