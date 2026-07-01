<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Auto-post due recurring bills (weekly/monthly/etc.) that have auto_post enabled
Schedule::command('bills:generate')->dailyAt('01:00');
