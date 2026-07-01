<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiClient;
use Illuminate\Http\Request;

class ReceiptController extends Controller
{
    public function scan(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // 10MB Max
        ]);

        $ai = AiClient::fromRequest($request);
        if (!$ai->hasKey()) {
            return response()->json(['message' => 'AI API key is not configured. Please set it in AI Config.'], 500);
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

            // Save the image first so we can return its public URL
            $fileName = time() . '_' . $request->file('image')->getClientOriginalName();
            $path = $request->file('image')->storeAs('receipts', $fileName, 'public');
            $publicUrl = '/storage/' . $path;

            // Parse with the configured AI provider (Gemini/OpenAI)
            $parsed = $ai->visionJson($prompt, $base64Data, $mimeType);

            // Ensure items key always exists
            if (!isset($parsed['items'])) {
                $parsed['items'] = [];
            }

            // Ensure required fields
            $parsed['amount'] = $parsed['total_amount'] ?? $parsed['amount'] ?? 0;
            $parsed['image_path'] = $publicUrl; // Return the path to the frontend

            return response()->json($parsed);

        } catch (\Exception $e) {
            info('ReceiptController scan error: ' . $e->getMessage());
            return response()->json(['message' => 'An error occurred while scanning the receipt: ' . $e->getMessage()], 500);
        }
    }
}
