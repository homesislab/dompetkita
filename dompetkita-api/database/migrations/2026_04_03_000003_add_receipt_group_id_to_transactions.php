<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('receipt_group_id')
                  ->nullable()
                  ->after('description')
                  ->constrained('receipt_groups')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['receipt_group_id']);
            $table->dropColumn('receipt_group_id');
        });
    }
};
