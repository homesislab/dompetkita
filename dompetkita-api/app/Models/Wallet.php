<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    protected $fillable = [
        'household_id',
        'user_id',
        'name',
        'type',
        'icon',
        'color',
        'balance'
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
