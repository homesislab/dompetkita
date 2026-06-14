<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Household;
use App\Models\HouseholdUser;
use App\Models\User;
use App\Models\Wallet;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // 1. Create Users
            $husband = User::create([
                'name' => 'Suami Anggy',
                'email' => 'suami@dompetkita.test',
                'password' => Hash::make('password123'),
            ]);

            $wife = User::create([
                'name' => 'Istri Anggy',
                'email' => 'istri@dompetkita.test',
                'password' => Hash::make('password123'),
            ]);

            $child = User::create([
                'name' => 'Anak Anggy',
                'email' => 'anak@dompetkita.test',
                'password' => Hash::make('password123'),
            ]);

            // 2. Create Household (Shared Ledger)
            $household = Household::create([
                'name' => 'Keluarga Anggy'
            ]);

            // 3. Link Users to Household
            HouseholdUser::create(['household_id' => $household->id, 'user_id' => $husband->id, 'role' => 'admin']);
            HouseholdUser::create(['household_id' => $household->id, 'user_id' => $wife->id, 'role' => 'admin']);
            HouseholdUser::create(['household_id' => $household->id, 'user_id' => $child->id, 'role' => 'member']);

            // 4. Create Wallets for the Household
            Wallet::create([
                'household_id' => $household->id,
                'name' => 'BCA Suami',
                'type' => 'bank',
                'balance' => 17000000
            ]);

            Wallet::create([
                'household_id' => $household->id,
                'name' => 'Dompet Tunai Istri',
                'type' => 'cash',
                'balance' => 0
            ]);

            Wallet::create([
                'household_id' => $household->id,
                'name' => 'Gopay Belanja',
                'type' => 'e-wallet',
                'balance' => 0
            ]);

            // 5. Create Base Categories for the Household
            $expenseCategories = [
                'Pendidikan Anak',
                'Belanja Dapur',
                'Internet & Listrik',
                'Bensin Mandiri',
                'Cicilan KPR'
            ];

            $incomeCategories = [
                'Gaji Suami',
                'Gaji Istri',
                'Bonus/THR'
            ];

            foreach ($expenseCategories as $cat) {
                Category::create([
                    'household_id' => $household->id,
                    'name' => $cat,
                    'type' => 'expense'
                ]);
            }

            foreach ($incomeCategories as $cat) {
                 Category::create([
                    'household_id' => $household->id,
                    'name' => $cat,
                    'type' => 'income'
                ]);
            }
        });
    }
}
