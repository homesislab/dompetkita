<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Static-token auth for machine-to-machine callers such as n8n.
 *
 * The caller must send the token in either:
 *   - Header "X-Api-Key: <token>", or
 *   - Header "Authorization: Bearer <token>"
 *
 * The expected token is config('services.n8n.token') (env N8N_API_TOKEN).
 */
class N8nApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('services.n8n.token');

        if (empty($expected)) {
            return response()->json([
                'success' => false,
                'message' => 'N8N_API_TOKEN belum dikonfigurasi di server.',
            ], 503);
        }

        $provided = $request->header('X-Api-Key') ?: $request->bearerToken();

        if (!$provided || !hash_equals((string) $expected, (string) $provided)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: token n8n tidak valid.',
            ], 401);
        }

        return $next($request);
    }
}
