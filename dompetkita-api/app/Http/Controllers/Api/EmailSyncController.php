<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailSyncLog;
use App\Models\HouseholdUser;
use App\Models\Transaction;
use App\Models\Wallet;
use App\Services\EmailParserService;
use App\Services\GmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EmailSyncController extends Controller
{
    public function __construct(
        private readonly GmailService      $gmail,
        private readonly EmailParserService $parser,
    ) {}

    /**
     * GET /api/email-sync/status
     * Return Gmail connection status for the current user.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'success'   => true,
            'connected' => $user->hasGmailConnected(),
            'gmail_email' => $user->gmail_email,
        ]);
    }

    /**
     * GET /api/email-sync/auth (alias, unused by frontend but kept for completeness)
     */
    public function auth(Request $request): JsonResponse
    {
        $url = $this->gmail->getAuthUrl($request->user()->id);
        return response()->json(['success' => true, 'url' => $url]);
    }

    /**
     * GET /api/email-sync/callback
     * Handle OAuth callback, store tokens (stateless via signed state param).
     */
    public function callback(Request $request): \Illuminate\Http\RedirectResponse
    {
        $code        = $request->query('code');
        $state       = $request->query('state', '');
        $error       = $request->query('error');
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', url('/')));

        if ($error || !$code) {
            return redirect($frontendUrl . '?gmail_error=access_denied');
        }

        try {
            // Decode signed state to get user ID — no session required
            $userId = $this->gmail->verifyState($state);
            $user   = \App\Models\User::findOrFail($userId);

            $token = $this->gmail->exchangeCode($code);

            // Extract Gmail email from the id_token JWT (no extra API call needed)
            // Google includes email in id_token when openid+email scopes are granted
            $gmailEmail = $this->decodeEmailFromToken($token);

            $user->update([
                'gmail_access_token'     => $token['access_token'],
                'gmail_refresh_token'    => $token['refresh_token'] ?? $user->gmail_refresh_token,
                'gmail_token_expires_at' => now()->addSeconds($token['expires_in'] ?? 3600),
                'gmail_email'            => $gmailEmail ?: $user->email,
            ]);

            return redirect($frontendUrl . '?gmail_connected=1');

        } catch (\Exception $e) {
            Log::error('Gmail OAuth callback error: ' . $e->getMessage());
            return redirect($frontendUrl . '?gmail_error=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Decode email from Google id_token JWT payload (no API call needed).
     */
    private function decodeEmailFromToken(array $token): ?string
    {
        try {
            if (empty($token['id_token'])) return null;
            $parts   = explode('.', $token['id_token']);
            if (count($parts) < 2) return null;
            $payload = json_decode(base64_decode(str_pad(
                strtr($parts[1], '-_', '+/'),
                strlen($parts[1]) % 4 === 0 ? strlen($parts[1]) : strlen($parts[1]) + 4 - strlen($parts[1]) % 4,
                '='
            )), true);
            return $payload['email'] ?? null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * POST /api/email-sync/auth-init
     * Return Gmail OAuth URL with signed state (stateless — no session needed).
     */
    public function authInit(Request $request): JsonResponse
    {
        $url = $this->gmail->getAuthUrl($request->user()->id);
        return response()->json(['success' => true, 'url' => $url]);
    }

    /**
     * POST /api/email-sync/fetch
     * Fetch & parse new payment notification emails. Returns preview list.
     */
    public function fetch(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasGmailConnected()) {
            return response()->json([
                'success' => false,
                'message' => 'Gmail belum terhubung. Silakan hubungkan Gmail terlebih dahulu.',
            ], 422);
        }

        $apiKey = $request->header('X-Gemini-Key') ?: config('services.gemini.key');
        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'Gemini API key belum dikonfigurasi.',
            ], 500);
        }

        try {
            // 1. Fetch raw emails from Gmail
            $rawEmails = $this->gmail->fetchPaymentEmails($user, 15);

            if (empty($rawEmails)) {
                return response()->json([
                    'success' => true,
                    'data'    => [],
                    'message' => 'Tidak ada email notifikasi pembayaran baru.',
                ]);
            }

            // 2. Parse with Gemini AI
            $parsed = $this->parser->parseEmails($rawEmails, $apiKey);

            // 3. Save as pending EmailSyncLog entries (for display in UI)
            $savedLogs = [];
            foreach ($parsed as $item) {
                // Upsert by message_id to prevent duplicates
                $log = EmailSyncLog::updateOrCreate(
                    ['gmail_message_id' => $item['message_id']],
                    [
                        'user_id'          => $user->id,
                        'provider'         => $item['provider'],
                        'subject'          => $item['subject'] ?? null,
                        'parsed_amount'    => $item['amount'] ?? 0,
                        'parsed_type'      => $item['type'] ?? 'expense',
                        'parsed_merchant'  => $item['merchant'] ?? null,
                        'parsed_date'      => $item['transaction_date'] ?? now()->toDateString(),
                        'raw_snippet'      => $item['snippet'] ?? null,
                        'status'           => 'pending',
                    ]
                );
                $savedLogs[] = $log;
            }

            return response()->json([
                'success' => true,
                'data'    => $savedLogs,
                'count'   => count($savedLogs),
            ]);

        } catch (\Exception $e) {
            Log::error('EmailSync fetch error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/email-sync/pending
     * Get all pending email sync logs for the current user.
     */
    public function pending(Request $request): JsonResponse
    {
        $logs = EmailSyncLog::where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->with('wallet')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $logs]);
    }

    /**
     * GET /api/email-sync/history
     * Get confirmed/skipped email sync history.
     */
    public function history(Request $request): JsonResponse
    {
        $logs = EmailSyncLog::where('user_id', $request->user()->id)
            ->whereIn('status', ['confirmed', 'skipped'])
            ->with(['transaction', 'wallet'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['success' => true, 'data' => $logs]);
    }

    /**
     * POST /api/email-sync/confirm/{logId}
     * Confirm a pending email sync log → create transaction & update balance.
     */
    public function confirm(Request $request, $householdId, $logId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'wallet_id'   => 'required|exists:wallets,id',
            'category_id' => 'nullable|exists:categories,id',
            'amount'      => 'required|numeric|min:0.01',
            'type'        => 'required|in:income,expense',
            'description' => 'nullable|string',
        ]);

        $log = EmailSyncLog::where('id', $logId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->firstOrFail();

        try {
            DB::transaction(function () use ($request, $log, $householdId) {
                $wallet = Wallet::where('id', $request->wallet_id)
                    ->where('household_id', $householdId)
                    ->lockForUpdate()
                    ->firstOrFail();

                // Update wallet balance
                if ($request->type === 'expense') {
                    $wallet->balance -= (float) $request->amount;
                } else {
                    $wallet->balance += (float) $request->amount;
                }
                $wallet->save();

                // Create transaction record
                $transaction = Transaction::create([
                    'household_id'     => $householdId,
                    'user_id'          => $request->user()->id,
                    'type'             => $request->type,
                    'amount'           => $request->amount,
                    'admin_fee'        => 0,
                    'wallet_id'        => $request->wallet_id,
                    'category_id'      => $request->category_id,
                    'description'      => $request->description ?: ($log->parsed_merchant ?? 'Sinkronisasi Email'),
                    'transaction_date' => $log->parsed_date ?? now(),
                ]);

                // Mark log as confirmed
                $log->update([
                    'status'         => 'confirmed',
                    'transaction_id' => $transaction->id,
                    'wallet_id'      => $wallet->id,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil disimpan dan saldo diperbarui.',
            ]);

        } catch (\Exception $e) {
            Log::error('EmailSync confirm error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan transaksi: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * POST /api/email-sync/skip/{logId}
     * Skip a pending email sync log.
     */
    public function skip(Request $request, $logId): JsonResponse
    {
        $log = EmailSyncLog::where('id', $logId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $log->update(['status' => 'skipped']);

        return response()->json(['success' => true, 'message' => 'Email dilewati.']);
    }

    /**
     * DELETE /api/email-sync/disconnect
     * Revoke Gmail access and clear stored tokens.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $request->user()->update([
            'gmail_access_token'     => null,
            'gmail_refresh_token'    => null,
            'gmail_token_expires_at' => null,
            'gmail_email'            => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Gmail berhasil diputus.',
        ]);
    }

    private function authorizeHousehold($userId, $householdId): void
    {
        $exists = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $userId)
            ->exists();

        if (!$exists) {
            abort(403, 'Unauthorized access to this household.');
        }
    }
}
