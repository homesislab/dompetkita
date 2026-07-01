<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'household_id',
        'user_id',
        'type',
        'amount',
        'admin_fee',
        'wallet_id',
        'to_wallet_id',
        'category_id',
        'description',
        'receipt_group_id',
        'transaction_date',
        'image_path'
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function toWallet()
    {
        return $this->belongsTo(Wallet::class, 'to_wallet_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function receiptGroup()
    {
        return $this->belongsTo(ReceiptGroup::class);
    }

    public function allocations()
    {
        return $this->hasMany(TransactionAllocation::class);
    }
}
