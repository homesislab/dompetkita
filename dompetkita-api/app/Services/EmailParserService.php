<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmailParserService
{
    /**
     * Map common sender domains to provider display names.
     */
    private const PROVIDER_MAP = [
        'bankmandiri'  => 'Bank Mandiri',
        'mandiri'      => 'Bank Mandiri',
        'bca'          => 'Bank BCA',
        'bni'          => 'Bank BNI',
        'bri'          => 'Bank BRI',
        'cimbniaga'    => 'CIMB Niaga',
        'danamon'      => 'Bank Danamon',
        'permatabank'  => 'PermataBank',
        'gopay'        => 'GoPay',
        'gojek'        => 'GoPay',
        'shopee'       => 'Shopee Pay',
        'ovo'          => 'OVO',
        'dana'         => 'DANA',
        'linkaja'      => 'LinkAja',
        'jenius'       => 'Jenius',
        'flip'         => 'Flip',
    ];

    /**
     * Parse a list of raw emails using OpenAI.
     * Returns structured transaction data for each email.
     */
    public function parseEmails(array $rawEmails, string $apiKey): array
    {
        $results = [];

        foreach ($rawEmails as $email) {
            try {
                $parsed = $this->parseOneEmail($email, $apiKey);
                if ($parsed) {
                    $parsed['message_id'] = $email['message_id'];
                    $parsed['snippet']    = $email['snippet'] ?? '';
                    $parsed['provider']   = $this->detectProvider($email['from'] ?? '');
                    $results[] = $parsed;
                }

                // Small delay to stay well under OpenAI rate limits (HTTP 429)
                sleep(1);

            } catch (\Exception $e) {
                Log::warning("EmailParserService: failed to parse message {$email['message_id']}: " . $e->getMessage());
            }
        }

        return $results;
    }

    /**
     * Parse a single email using OpenAI.
     */
    private function parseOneEmail(array $email, string $apiKey): ?array
    {
        $emailContent = "Subject: {$email['subject']}\nFrom: {$email['from']}\nDate: {$email['date']}\n\n{$email['body']}";

        $prompt = <<<PROMPT
Kamu adalah asisten keuangan yang menganalisis email notifikasi transaksi perbankan dan dompet digital Indonesia.

Analisis email berikut dan ekstrak informasi transaksi. Balas HANYA dengan JSON mentah (tanpa markdown, tanpa backtick):

{
  "is_transaction": true,
  "type": "expense",
  "amount": 150000,
  "merchant": "Indomaret",
  "description": "Pembayaran di Indomaret via GoPay",
  "transaction_date": "2026-05-03",
  "currency": "IDR"
}

Aturan:
- "is_transaction": true jika ini adalah notifikasi transaksi keuangan yang valid (debit, kredit, transfer, pembayaran). false jika bukan (promosi, OTP, info umum, dll).
- "type": "expense" jika saldo berkurang (debit, pembayaran, penarikan), "income" jika saldo bertambah (kredit, top up, terima transfer)
- "amount": nominal transaksi sebagai angka murni tanpa simbol, titik, koma (contoh: 150000)
- "merchant": nama merchant/toko/pengirim/penerima transfer jika ada, atau null
- "description": ringkasan singkat dalam Bahasa Indonesia (maksimal 60 karakter)
- "transaction_date": tanggal transaksi format YYYY-MM-DD. Jika tidak ada gunakan hari ini.
- "currency": selalu "IDR" kecuali jelas mata uang lain

Email yang akan dianalisis:
---
{$emailContent}
---
PROMPT;

        $model = config('services.openai.model', 'gpt-4o-mini');
        $response = Http::acceptJson()
            ->withToken($apiKey)
            ->timeout(30)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'temperature' => 0.1,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => 'Kamu mengekstrak notifikasi transaksi keuangan dari email menjadi satu objek JSON yang valid.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

        if (!$response->successful()) {
            Log::warning('EmailParserService: OpenAI API error ' . $response->status());
            return null;
        }

        $result = $response->json();
        $text   = $result['choices'][0]['message']['content'] ?? '{}';
        $text   = str_replace(['```json', '```'], '', trim($text));
        $parsed = json_decode($text, true);

        if (!$parsed || json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        // Only return actual transactions
        if (empty($parsed['is_transaction']) || $parsed['is_transaction'] === false) {
            return null;
        }

        return $parsed;
    }

    /**
     * Detect provider name from sender email address.
     */
    public function detectProvider(string $from): string
    {
        $from = strtolower($from);
        foreach (self::PROVIDER_MAP as $key => $name) {
            if (str_contains($from, $key)) {
                return $name;
            }
        }
        return 'Unknown';
    }
}
