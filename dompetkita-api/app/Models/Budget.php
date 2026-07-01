<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    protected $fillable = [
        'household_id',
        'category_id',
        'amount',
        'period',
        'start_date',
        'end_date',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
