<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pocket extends Model
{
    protected $fillable = [
        'household_id',
        'name',
        'type',
        'beneficiary',
        'balance',
        'is_protected',
        'allowed_category_ids',
        'icon',
        'color',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'is_protected' => 'boolean',
        'allowed_category_ids' => 'array',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    public function allocations()
    {
        return $this->hasMany(TransactionAllocation::class);
    }
}
