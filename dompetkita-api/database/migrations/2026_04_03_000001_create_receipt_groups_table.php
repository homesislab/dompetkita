<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained('households')->onDelete('cascade');
            $table->foreignId('wallet_id')->constrained('wallets'); // wallet yang digunakan untuk bayar
            $table->string('store_name')->nullable();               // Nama toko
            $table->date('purchase_date');                          // Tanggal beli
            $table->decimal('total_amount', 15, 2);                 // Total struk
            $table->string('notes')->nullable();                    // Catatan bebas
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_groups');
    }
};
