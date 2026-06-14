<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('gmail_message_id')->unique(); // prevent duplicate processing
            $table->string('provider')->nullable();       // mandiri, bca, gopay, etc.
            $table->string('subject')->nullable();
            $table->decimal('parsed_amount', 15, 2)->nullable();
            $table->string('parsed_type')->nullable();   // income / expense / transfer
            $table->string('parsed_merchant')->nullable();
            $table->date('parsed_date')->nullable();
            $table->text('raw_snippet')->nullable();     // email excerpt for display
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('wallet_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('pending'); // pending / confirmed / skipped
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_sync_logs');
    }
};
