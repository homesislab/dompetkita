<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bill_reminders', function (Blueprint $table) {
            $table->foreignId('wallet_id')->nullable()->after('category_id')->constrained()->onDelete('set null');
            $table->foreignId('pocket_id')->nullable()->after('wallet_id')->constrained()->onDelete('set null');
            $table->unsignedInteger('repeat_interval')->default(1)->after('repeat_type');
            $table->boolean('auto_post')->default(false)->after('repeat_interval');
            $table->date('last_generated_date')->nullable()->after('auto_post');
        });
    }

    public function down(): void
    {
        Schema::table('bill_reminders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('wallet_id');
            $table->dropConstrainedForeignId('pocket_id');
            $table->dropColumn(['repeat_interval', 'auto_post', 'last_generated_date']);
        });
    }
};
