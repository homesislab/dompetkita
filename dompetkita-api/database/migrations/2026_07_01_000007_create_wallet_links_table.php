<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->onDelete('cascade');
            $table->foreignId('owner_household_id')->constrained('households')->onDelete('cascade');
            $table->foreignId('shared_household_id')->constrained('households')->onDelete('cascade');
            $table->string('permission')->default('view'); // view, spend
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['wallet_id', 'shared_household_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_links');
    }
};
