<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies that data is strictly isolated per household: a user may never read
 * from or write to a household they do not belong to, and may never spend from
 * a wallet that belongs to another household.
 */
class HouseholdIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected $userA;
    protected $userB;
    protected $householdA;
    protected $householdB;
    protected $walletB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->userA = User::factory()->create();
        $this->userB = User::factory()->create();

        $this->householdA = Household::create(['name' => 'Keluarga A']);
        $this->householdB = Household::create(['name' => 'Keluarga B']);

        $this->householdA->users()->attach($this->userA->id, ['role' => 'admin']);
        $this->householdB->users()->attach($this->userB->id, ['role' => 'admin']);

        $this->walletB = Wallet::create([
            'household_id' => $this->householdB->id,
            'name' => 'BCA Keluarga B',
            'type' => 'bank',
            'balance' => 1000000,
        ]);
    }

    public function test_user_cannot_list_wallets_of_other_household()
    {
        $response = $this->actingAs($this->userA)
            ->getJson("/api/households/{$this->householdB->id}/wallets");

        $response->assertStatus(403);
    }

    public function test_user_cannot_create_transaction_in_other_household()
    {
        $response = $this->actingAs($this->userA)
            ->postJson("/api/households/{$this->householdB->id}/transactions", [
                'type' => 'expense',
                'amount' => 50000,
                'wallet_id' => $this->walletB->id,
                'transaction_date' => '2026-03-15 08:00:00',
            ]);

        $response->assertStatus(403);

        // Wallet B balance must be untouched.
        $this->assertEquals(1000000, (float) $this->walletB->fresh()->balance);
    }

    public function test_user_cannot_spend_from_wallet_belonging_to_another_household()
    {
        // userA legitimately owns householdA, but references a wallet from householdB.
        // The wallet lookup is scoped to householdA, so the ledger write must fail
        // and no balance may change.
        $response = $this->actingAs($this->userA)
            ->postJson("/api/households/{$this->householdA->id}/transactions", [
                'type' => 'expense',
                'amount' => 50000,
                'wallet_id' => $this->walletB->id,
                'transaction_date' => '2026-03-15 08:00:00',
            ]);

        $response->assertStatus(400);

        $this->assertEquals(1000000, (float) $this->walletB->fresh()->balance);
        $this->assertDatabaseMissing('transactions', [
            'wallet_id' => $this->walletB->id,
        ]);
    }
}
