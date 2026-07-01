<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Provider-agnostic AI client for JSON extraction tasks.
 *
 * Supports two providers, selectable via config('services.ai.provider')
 * (env AI_PROVIDER) or a per-request "X-AI-Provider" header:
 *   - "gemini" (Google Generative Language API) — default
 *   - "openai" (OpenAI Chat Completions API)
 *
 * Both text-only and vision (image) prompts are supported and always
 * return a decoded associative array of JSON.
 */
class AiClient
{
    protected string $provider;
    protected ?string $geminiKey;
    protected ?string $openaiKey;
    protected string $geminiVisionModel;
    protected string $geminiTextModel;
    protected string $openaiModel;

    public function __construct(
        ?string $provider = null,
        ?string $geminiKey = null,
        ?string $openaiKey = null
    ) {
        $this->provider = strtolower($provider ?: (string) config('services.ai.provider', 'gemini'));
        $this->geminiKey = $geminiKey ?: config('services.gemini.key');
        $this->openaiKey = $openaiKey ?: config('services.openai.key');
        $this->geminiVisionModel = (string) config('services.gemini.vision_model', 'gemini-flash-lite-latest');
        $this->geminiTextModel = (string) config('services.gemini.text_model', 'gemini-1.5-flash');
        $this->openaiModel = (string) config('services.openai.model', 'gpt-4o-mini');
    }

    /**
     * Build a client from an HTTP request, honoring optional override headers:
     *   X-AI-Provider, X-Gemini-Key, X-OpenAI-Key
     */
    public static function fromRequest(Request $request): self
    {
        return new self(
            $request->header('X-AI-Provider') ?: null,
            $request->header('X-Gemini-Key') ?: null,
            $request->header('X-OpenAI-Key') ?: null,
        );
    }

    public function provider(): string
    {
        return $this->provider;
    }

    /** Whether the active provider has an API key configured. */
    public function hasKey(): bool
    {
        return $this->provider === 'openai'
            ? !empty($this->openaiKey)
            : !empty($this->geminiKey);
    }

    /** Parse a prompt + image into a JSON array. */
    public function visionJson(string $prompt, string $base64, string $mime): array
    {
        return $this->provider === 'openai'
            ? $this->openaiJson($prompt, $base64, $mime)
            : $this->geminiJson($prompt, $base64, $mime);
    }

    /** Parse a text-only prompt into a JSON array. */
    public function textJson(string $prompt): array
    {
        return $this->provider === 'openai'
            ? $this->openaiJson($prompt)
            : $this->geminiJson($prompt);
    }

    // ------------------------------------------------------------------
    // Gemini
    // ------------------------------------------------------------------
    protected function geminiJson(string $prompt, ?string $base64 = null, ?string $mime = null): array
    {
        if (empty($this->geminiKey)) {
            throw new \RuntimeException('Gemini API key belum dikonfigurasi.');
        }

        $model = $base64 ? $this->geminiVisionModel : $this->geminiTextModel;

        $parts = [['text' => $prompt]];
        if ($base64 !== null) {
            $parts[] = ['inline_data' => ['mime_type' => $mime, 'data' => $base64]];
        }

        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/'
            . $model . ':generateContent?key=' . $this->geminiKey;

        $response = Http::withHeaders(['Content-Type' => 'application/json'])
            ->timeout(60)
            ->post($endpoint, [
                'contents' => [['parts' => $parts]],
                'generationConfig' => [
                    'temperature' => 0.1,
                    'response_mime_type' => 'application/json',
                ],
            ]);

        if (!$response->successful()) {
            Log::warning('AiClient(Gemini) error ' . $response->status() . ': ' . $response->body());
            throw new \RuntimeException('Gemini API error: ' . $response->status());
        }

        $text = $response->json('candidates.0.content.parts.0.text', '{}');

        return $this->decodeJson($text);
    }

    // ------------------------------------------------------------------
    // OpenAI
    // ------------------------------------------------------------------
    protected function openaiJson(string $prompt, ?string $base64 = null, ?string $mime = null): array
    {
        if (empty($this->openaiKey)) {
            throw new \RuntimeException('OpenAI API key belum dikonfigurasi.');
        }

        $content = [['type' => 'text', 'text' => $prompt]];
        if ($base64 !== null) {
            $content[] = [
                'type' => 'image_url',
                'image_url' => ['url' => 'data:' . $mime . ';base64,' . $base64],
            ];
        }

        $response = Http::withToken($this->openaiKey)
            ->timeout(60)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $this->openaiModel,
                'temperature' => 0.1,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'user', 'content' => $content],
                ],
            ]);

        if (!$response->successful()) {
            Log::warning('AiClient(OpenAI) error ' . $response->status() . ': ' . $response->body());
            throw new \RuntimeException('OpenAI API error: ' . $response->status());
        }

        $text = $response->json('choices.0.message.content', '{}');

        return $this->decodeJson($text);
    }

    protected function decodeJson(?string $text): array
    {
        $text = str_replace(['```json', '```'], '', trim((string) $text));
        $parsed = json_decode($text, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($parsed)) {
            throw new \RuntimeException('AI mengembalikan data JSON yang tidak valid.');
        }

        return $parsed;
    }
}
