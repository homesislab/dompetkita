<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pockets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('type')->default('general'); // child, saving, operational, general
            $table->string('beneficiary')->nullable();
            $table->decimal('balance', 15, 2)->default(0);
            $table->boolean('is_protected')->default(false);
            $table->json('allowed_category_ids')->nullable();
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pockets');
    }
};
