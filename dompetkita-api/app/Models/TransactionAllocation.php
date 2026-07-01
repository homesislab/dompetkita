<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransactionAllocation extends Model
{
    protected $fillable = [
        'transaction_id',
        'wallet_id',
        'pocket_id',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function pocket()
    {
        return $this->belongsTo(Pocket::class);
    }
}
