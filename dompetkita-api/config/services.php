<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'ai' => [
        // Default AI provider for parsing: 'gemini' (default) or 'openai'.
        'provider' => env('AI_PROVIDER', 'gemini'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        'vision_model' => env('GEMINI_VISION_MODEL', 'gemini-flash-lite-latest'),
        'text_model' => env('GEMINI_TEXT_MODEL', 'gemini-1.5-flash'),
    ],

    'openai' => [
        'key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
    ],

    'n8n' => [
        // Static token that n8n must send (X-Api-Key or Bearer) to call /api/n8n/*.
        'token' => env('N8N_API_TOKEN'),
        // Optional outbound webhook DompetKita posts events to (e.g. daily budget reminders).
        'webhook_url' => env('N8N_WEBHOOK_URL'),
    ],

    'google' => [
        'client_id'      => env('GOOGLE_CLIENT_ID'),
        'client_secret'  => env('GOOGLE_CLIENT_SECRET'),
        'redirect'       => env('APP_URL', 'http://localhost:8000') . '/api/auth/google/callback',
        'gmail_redirect' => env('GMAIL_REDIRECT_URI', env('APP_URL', 'http://localhost:8000') . '/api/email-sync/callback'),
    ],

];
