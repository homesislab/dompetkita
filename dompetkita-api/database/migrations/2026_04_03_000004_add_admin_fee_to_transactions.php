<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add admin_fee column to transactions
        Schema::table('transactions', function (Blueprint $table) {
            $table->decimal('admin_fee', 15, 2)->default(0)->after('amount');
        });

        // 2. SQLite doesn't support ALTER COLUMN to change enum, so we recreate 
        // the column by renaming and adding. Since SQLite has no native ENUM,
        // we just need to make sure 'adjustment' is a valid value at the app level.
        // The existing 'type' column is stored as TEXT in SQLite, so we just 
        // need to update any constraints via a raw statement.
        // For SQLite: the column is stored as varchar so 'adjustment' will work.
        // We only need to add it if using MySQL with strict ENUM.
        // Since we're on SQLite, no migration needed for enum change.
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('admin_fee');
        });
    }
};
