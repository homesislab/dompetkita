<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HouseholdUser extends Model
{
    protected $table = 'household_users';

    protected $fillable = [
        'household_id',
        'user_id',
        'role',
        'status',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
