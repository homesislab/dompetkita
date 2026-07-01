<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The BudgetController and the web UI both read/write an optional
     * `end_date`, but the original budgets table never had the column.
     * Saving a budget with an end date used to throw a DB error.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('budgets', 'end_date')) {
            Schema::table('budgets', function (Blueprint $table) {
                $table->date('end_date')->nullable()->after('start_date');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('budgets', 'end_date')) {
            Schema::table('budgets', function (Blueprint $table) {
                $table->dropColumn('end_date');
            });
        }
    }
};
