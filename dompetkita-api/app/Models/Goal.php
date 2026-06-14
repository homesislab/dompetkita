<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Goal extends Model
{
    protected $fillable = [
        'household_id',
        'name',
        'target_amount',
        'current_amount',
        'color',
        'deadline',
        'frequency',
        'target_per_period',
    ];

    public function items()
    {
        return $this->hasMany(GoalItem::class);
    }
}
