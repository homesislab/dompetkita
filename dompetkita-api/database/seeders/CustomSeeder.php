<?php

namespace Database\Seeders;

use App\Models\Household;
use App\Models\Wallet;
use App\Models\Category;
use Illuminate\Database\Seeder;

class CustomSeeder extends Seeder
{
    public function run(): void
    {
        $h = Household::first();
        if (!$h) return;

        $wallets = ['Dompet Anggy' => 17000000, 'Dompet Dewi' => 0, 'Dompet Mamah' => 0];
        foreach($wallets as $name => $bal) {
            Wallet::firstOrCreate(['household_id' => $h->id, 'name' => $name], ['type' => 'cash', 'balance' => $bal]);
        }

        $expenses = ['Pendidikan Anak', 'Rumah Tangga', 'Utilitas', 'Operasional Kerja', 'Mamah', 'Urban Farming', 'Biaya Admin & Lainnya'];
        foreach($expenses as $e) {
            Category::firstOrCreate(['household_id' => $h->id, 'name' => $e], ['type' => 'expense']);
        }

        $incomes = ['Gaji Utama', 'Hasil Kebun/Ternak'];
        foreach($incomes as $i) {
            Category::firstOrCreate(['household_id' => $h->id, 'name' => $i], ['type' => 'income']);
        }
    }
}
