<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiptItem extends Model
{
    protected $fillable = [
        'receipt_group_id',
        'name',
        'quantity',
        'unit',
        'unit_price',
        'total_price',
    ];

    protected $casts = [
        'quantity'   => 'decimal:3',
        'unit_price' => 'decimal:2',
        'total_price'=> 'decimal:2',
    ];

    public function receiptGroup()
    {
        return $this->belongsTo(ReceiptGroup::class);
    }
}
