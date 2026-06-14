<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receipt_group_id')->constrained('receipt_groups')->onDelete('cascade');
            $table->string('name');                          // Nama item, e.g. "Sabun Lifebuoy 75ml"
            $table->decimal('quantity', 10, 3)->default(1);  // Jumlah (bisa desimal, e.g. 0.5 kg)
            $table->string('unit')->nullable();              // e.g. "pcs", "kg", "ltr"
            $table->decimal('unit_price', 15, 2);            // Harga satuan
            $table->decimal('total_price', 15, 2);           // Total = qty * unit_price
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_items');
    }
};
