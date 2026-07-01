<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price', 12, 2)->default(0);
            $table->string('interval')->default('monthly'); // monthly, yearly, lifetime
            $table->integer('max_households')->default(1);
            $table->integer('max_members')->default(2);
            $table->integer('max_wallets')->default(3);
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed default SaaS plans
        $now = now();
        DB::table('plans')->insert([
            [
                'name' => 'Free',
                'slug' => 'free',
                'price' => 0,
                'interval' => 'monthly',
                'max_households' => 1,
                'max_members' => 2,
                'max_wallets' => 3,
                'features' => json_encode([
                    'receipt_scan' => true,
                    'email_sync' => false,
                    'ai_provider' => 'gemini',
                    'n8n' => false,
                    'planner' => false,
                    'shared_wallets' => false,
                ]),
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price' => 49000,
                'interval' => 'monthly',
                'max_households' => 3,
                'max_members' => 6,
                'max_wallets' => 15,
                'features' => json_encode([
                    'receipt_scan' => true,
                    'email_sync' => true,
                    'ai_provider' => 'openai',
                    'n8n' => true,
                    'planner' => true,
                    'shared_wallets' => true,
                ]),
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Family',
                'slug' => 'family',
                'price' => 99000,
                'interval' => 'monthly',
                'max_households' => 10,
                'max_members' => 20,
                'max_wallets' => 50,
                'features' => json_encode([
                    'receipt_scan' => true,
                    'email_sync' => true,
                    'ai_provider' => 'openai',
                    'n8n' => true,
                    'planner' => true,
                    'shared_wallets' => true,
                ]),
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
