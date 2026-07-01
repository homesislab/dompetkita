<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillReminder extends Model
{
    protected $fillable = [
        'household_id',
        'category_id',
        'wallet_id',
        'pocket_id',
        'name',
        'amount',
        'due_date',
        'repeat_type',
        'repeat_interval',
        'auto_post',
        'last_generated_date',
        'is_optional',
        'is_paid',
        'notes',
    ];

    protected $casts = [
        'due_date' => 'date',
        'last_generated_date' => 'date',
        'auto_post' => 'boolean',
        'is_optional' => 'boolean',
        'is_paid' => 'boolean',
        'amount' => 'decimal:2',
        'repeat_interval' => 'integer',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
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
