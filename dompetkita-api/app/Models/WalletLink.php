<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletLink extends Model
{
    protected $fillable = [
        'wallet_id',
        'owner_household_id',
        'shared_household_id',
        'permission',
        'created_by',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function ownerHousehold()
    {
        return $this->belongsTo(Household::class, 'owner_household_id');
    }

    public function sharedHousehold()
    {
        return $this->belongsTo(Household::class, 'shared_household_id');
    }
}
