<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies ledger integrity: income/expense move balances correctly and a plain
 * transfer conserves the total amount of money across wallets.
 */
class LedgerIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $household;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->household = Household::create(['name' => 'Keluarga Anggy']);
        $this->household->users()->attach($this->user->id, ['role' => 'admin']);
    }

    private function wallet(string $name, float $balance): Wallet
    {
        return Wallet::create([
            'household_id' => $this->household->id,
            'name' => $name,
            'type' => 'bank',
            'balance' => $balance,
        ]);
    }

    public function test_income_increases_wallet_balance()
    {
        $wallet = $this->wallet('Cash', 0);

        $this->actingAs($this->user)
            ->postJson("/api/households/{$this->household->id}/transactions", [
                'type' => 'income',
                'amount' => 150000,
                'wallet_id' => $wallet->id,
                'transaction_date' => '2026-03-15 08:00:00',
            ])->assertStatus(201);

        $this->assertEquals(150000, (float) $wallet->fresh()->balance);
    }

    public function test_expense_decreases_wallet_balance()
    {
        $wallet = $this->wallet('Cash', 500000);

        $this->actingAs($this->user)
            ->postJson("/api/households/{$this->household->id}/transactions", [
                'type' => 'expense',
                'amount' => 200000,
                'wallet_id' => $wallet->id,
                'transaction_date' => '2026-03-15 08:00:00',
            ])->assertStatus(201);

        $this->assertEquals(300000, (float) $wallet->fresh()->balance);
    }

    public function test_transfer_preserves_total_balance()
    {
        $source = $this->wallet('BCA Suami', 1000000);
        $dest = $this->wallet('Dompet Istri', 0);

        $totalBefore = (float) $source->balance + (float) $dest->balance;

        $this->actingAs($this->user)
            ->postJson("/api/households/{$this->household->id}/transactions", [
                'type' => 'transfer',
                'amount' => 300000,
                'wallet_id' => $source->id,
                'to_wallet_id' => $dest->id,
                'transaction_date' => '2026-03-15 08:00:00',
            ])->assertStatus(201);

        $sourceAfter = (float) $source->fresh()->balance;
        $destAfter = (float) $dest->fresh()->balance;

        $this->assertEquals(700000, $sourceAfter);
        $this->assertEquals(300000, $destAfter);
        // No money is created or destroyed in a plain transfer (no admin fee).
        $this->assertEquals($totalBefore, $sourceAfter + $destAfter);
    }

    public function test_transfer_with_admin_fee_deducts_fee_from_source_only()
    {
        $source = $this->wallet('BCA Suami', 1000000);
        $dest = $this->wallet('Dompet Istri', 0);

        $this->actingAs($this->user)
            ->postJson("/api/households/{$this->household->id}/transactions", [
                'type' => 'transfer',
                'amount' => 300000,
                'admin_fee' => 6500,
                'wallet_id' => $source->id,
                'to_wallet_id' => $dest->id,
                'transaction_date' => '2026-03-15 08:00:00',
            ])->assertStatus(201);

        // Source loses amount + fee; destination receives only the amount.
        $this->assertEquals(693500, (float) $source->fresh()->balance);
        $this->assertEquals(300000, (float) $dest->fresh()->balance);
    }
}
