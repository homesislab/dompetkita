<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Best-effort outbound notifier: posts events to an n8n webhook URL when
 * config('services.n8n.webhook_url') (env N8N_WEBHOOK_URL) is configured.
 *
 * Failures are swallowed and logged so they never break the main request.
 */
class N8nNotifier
{
    public static function dispatch(string $event, array $payload): void
    {
        $url = config('services.n8n.webhook_url');
        if (empty($url)) {
            return;
        }

        try {
            Http::timeout(5)->post($url, [
                'event' => $event,
                'data' => $payload,
                'sent_at' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('N8nNotifier failed for event ' . $event . ': ' . $e->getMessage());
        }
    }
}
