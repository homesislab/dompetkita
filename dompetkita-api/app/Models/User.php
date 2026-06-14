<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'gmail_access_token',
        'gmail_refresh_token',
        'gmail_token_expires_at',
        'gmail_email',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'gmail_access_token',
        'gmail_refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'      => 'datetime',
            'password'               => 'hashed',
            'gmail_token_expires_at' => 'datetime',
        ];
    }

    public function households(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Household::class, 'household_users');
    }

    public function emailSyncLogs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EmailSyncLog::class);
    }

    /**
     * Check if user has a valid connected Gmail account.
     */
    public function hasGmailConnected(): bool
    {
        return !empty($this->gmail_access_token);
    }
}
