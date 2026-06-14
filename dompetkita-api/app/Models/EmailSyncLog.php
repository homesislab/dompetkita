<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailSyncLog extends Model
{
    protected $fillable = [
        'user_id',
        'gmail_message_id',
        'provider',
        'subject',
        'parsed_amount',
        'parsed_type',
        'parsed_merchant',
        'parsed_date',
        'raw_snippet',
        'transaction_id',
        'wallet_id',
        'status',
    ];

    protected $casts = [
        'parsed_date' => 'date',
        'parsed_amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }
}
