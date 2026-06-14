<?php

namespace App\Services;

use App\Models\User;
use Google\Client as GoogleClient;
use Google\Service\Gmail;

class GmailService
{
    /**
     * Known payment notification senders for Indonesian banks & e-wallets.
     * Used to build the Gmail search query.
     */
    private const PAYMENT_SENDERS = [
        // Banks
        'mandiri@bankmandiri.co.id',
        'notifikasi@bankmandiri.co.id',
        'info@klikbca.com',
        'cs@bca.co.id',
        'klikbca@bca.co.id',
        'bni@bni.co.id',
        'info@bni.co.id',
        'notification@bri.co.id',
        'info@cimbniaga.co.id',
        'notification@danamon.co.id',
        'info@permatabank.com',
        // E-wallets
        'noreply@gojek.com',
        'no-reply@gojek.com',
        'noreply@gopay.co.id',
        'no-reply@shopee.co.id',
        'noreply@ovo.id',
        'noreply@dana.id',
        'notification@dana.id',
        'noreply@linkaja.id',
        // QRIS / transfers
        'notification@flip.id',
        'noreply@jenius.com',
        'nonereply.byondbybsi@bankbsi.co.id',
    ];

    private GoogleClient $client;

    public function __construct()
    {
        $this->client = new GoogleClient();
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.gmail_redirect'));
        $this->client->setScopes([
            Gmail::GMAIL_READONLY,
            'openid',
            'email',
        ]);
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent'); // force refresh token
    }

    /**
     * Generate the OAuth authorization URL with a signed state parameter
     * (encodes user ID so we can identify them in the stateless callback).
     */
    public function getAuthUrl(int $userId): string
    {
        // Encode user ID + HMAC signature into state
        $payload   = base64_encode(json_encode(['uid' => $userId, 'ts' => time()]));
        $signature = hash_hmac('sha256', $payload, config('app.key'));
        $state     = $payload . '.' . $signature;

        $this->client->setState($state);
        return $this->client->createAuthUrl();
    }

    /**
     * Verify and decode the state parameter from the OAuth callback.
     * Returns user ID or throws on tampered/expired state.
     */
    public function verifyState(string $state): int
    {
        [$payload, $signature] = array_pad(explode('.', $state, 2), 2, '');

        $expected = hash_hmac('sha256', $payload, config('app.key'));
        if (!hash_equals($expected, $signature)) {
            throw new \Exception('Invalid OAuth state — possible CSRF attack.');
        }

        $data = json_decode(base64_decode($payload), true);
        if (!$data || empty($data['uid'])) {
            throw new \Exception('Malformed OAuth state.');
        }

        // Expire state after 10 minutes
        if (time() - ($data['ts'] ?? 0) > 600) {
            throw new \Exception('OAuth state expired. Please try connecting again.');
        }

        return (int) $data['uid'];
    }

    /**
     * Exchange authorization code for access + refresh tokens.
     */
    public function exchangeCode(string $code): array
    {
        $token = $this->client->fetchAccessTokenWithAuthCode($code);

        if (isset($token['error'])) {
            throw new \Exception('OAuth error: ' . $token['error_description'] ?? $token['error']);
        }

        return $token;
    }

    /**
     * Fetch unread payment notification emails for a given user.
     * Returns array of ['message_id', 'subject', 'body', 'from', 'date'].
     */
    public function fetchPaymentEmails(User $user, int $maxResults = 20): array
    {
        $this->setUserTokens($user);

        $gmail   = new Gmail($this->client);
        $senders = array_map(fn($s) => "from:{$s}", self::PAYMENT_SENDERS);
        $query   = '(' . implode(' OR ', $senders) . ') newer_than:30d';

        // Get already-processed message IDs to skip them
        $processed = $user->emailSyncLogs()->pluck('gmail_message_id')->toArray();

        $listResponse = $gmail->users_messages->listUsersMessages('me', [
            'q'          => $query,
            'maxResults' => $maxResults + count($processed), // fetch extra to account for skipped
        ]);

        $messages = $listResponse->getMessages() ?? [];
        $results  = [];

        foreach ($messages as $msg) {
            $messageId = $msg->getId();

            // Skip already-processed emails
            if (in_array($messageId, $processed)) {
                continue;
            }

            if (count($results) >= $maxResults) {
                break;
            }

            try {
                $full    = $gmail->users_messages->get('me', $messageId, ['format' => 'full']);
                $headers = $full->getPayload()->getHeaders();

                $subject = '';
                $from    = '';
                $date    = '';

                foreach ($headers as $header) {
                    match ($header->getName()) {
                        'Subject' => $subject = $header->getValue(),
                        'From'    => $from    = $header->getValue(),
                        'Date'    => $date    = $header->getValue(),
                        default   => null,
                    };
                }

                $body = $this->extractBody($full->getPayload());

                $results[] = [
                    'message_id' => $messageId,
                    'subject'    => $subject,
                    'from'       => $from,
                    'date'       => $date,
                    'body'       => substr($body, 0, 3000), // limit to 3000 chars for AI
                    'snippet'    => $full->getSnippet(),
                ];
            } catch (\Exception $e) {
                // Skip individual message errors, don't fail the whole batch
                \Log::warning("GmailService: could not fetch message {$messageId}: " . $e->getMessage());
                continue;
            }
        }

        return $results;
    }

    /**
     * Set user tokens on the client, refreshing if needed.
     */
    private function setUserTokens(User $user): void
    {
        $tokenData = [
            'access_token'  => $user->gmail_access_token,
            'refresh_token' => $user->gmail_refresh_token,
            'expires_in'    => 3600,
        ];

        if ($user->gmail_token_expires_at) {
            $tokenData['created'] = $user->gmail_token_expires_at->subHour()->timestamp;
        }

        $this->client->setAccessToken($tokenData);

        // Auto-refresh if token is expired
        if ($this->client->isAccessTokenExpired()) {
            if (!$user->gmail_refresh_token) {
                throw new \Exception('Gmail token expired and no refresh token available. Please reconnect Gmail.');
            }

            $newToken = $this->client->fetchAccessTokenWithRefreshToken($user->gmail_refresh_token);

            if (isset($newToken['error'])) {
                throw new \Exception('Could not refresh Gmail token. Please reconnect Gmail.');
            }

            $user->update([
                'gmail_access_token'     => $newToken['access_token'],
                'gmail_token_expires_at' => now()->addSeconds($newToken['expires_in'] ?? 3600),
            ]);
        }
    }

    /**
     * Recursively extract plain text body from email payload.
     */
    private function extractBody(\Google\Service\Gmail\MessagePart $payload): string
    {
        $mimeType = $payload->getMimeType();
        $body     = $payload->getBody();

        // Direct plain text
        if ($mimeType === 'text/plain' && $body && $body->getData()) {
            return base64_decode(strtr($body->getData(), '-_', '+/'));
        }

        // HTML fallback — strip tags
        if ($mimeType === 'text/html' && $body && $body->getData()) {
            $html = base64_decode(strtr($body->getData(), '-_', '+/'));
            return strip_tags($html);
        }

        // Multipart — recurse into parts
        $parts = $payload->getParts();
        if ($parts) {
            $text = '';
            foreach ($parts as $part) {
                $text .= $this->extractBody($part);
                if (strlen($text) > 3000) break;
            }
            return $text;
        }

        return '';
    }
}
