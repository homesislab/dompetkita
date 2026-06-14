<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoalItem extends Model
{
    protected $fillable = [
        'goal_id',
        'title',
        'is_completed',
    ];

    public function goal()
    {
        return $this->belongsTo(Goal::class);
    }
}
