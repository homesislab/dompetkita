<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("receipt_groups", function (Blueprint $table) {
            $table->string("image_path")->nullable()->after("notes");
        });
        Schema::table("transactions", function (Blueprint $table) {
            $table->string("image_path")->nullable()->after("description");
        });
    }

    public function down(): void
    {
        Schema::table("receipt_groups", function (Blueprint $table) {
            $table->dropColumn("image_path");
        });
        Schema::table("transactions", function (Blueprint $table) {
            $table->dropColumn("image_path");
        });
    }
};
