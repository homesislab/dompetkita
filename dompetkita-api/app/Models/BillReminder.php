<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillReminder extends Model
{
    protected $fillable = [
        'household_id',
        'category_id',
        'name',
        'amount',
        'due_date',
        'repeat_type',
        'is_paid',
        'notes',
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
