<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiptGroup extends Model
{
    protected $fillable = [
        'household_id',
        'wallet_id',
        'store_name',
        'purchase_date',
        'total_amount',
        'notes',
        'image_path',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'total_amount'  => 'decimal:2',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function items()
    {
        return $this->hasMany(ReceiptItem::class);
    }

    public function transaction()
    {
        return $this->hasOne(Transaction::class);
    }
}
