<?php

namespace Tests\Feature;

use App\Models\Goal;
use App\Models\Household;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoalEnhancementTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $household;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->household = Household::create(['name' => 'Test Household']);
        
        $this->household->users()->attach($this->user->id, ['role' => 'admin']);
    }

    public function test_can_create_goal_with_frequency()
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/households/{$this->household->id}/goals", [
                'name' => 'Save for Bike',
                'target_amount' => 5000000,
                'frequency' => 'monthly',
                'target_per_period' => 500000,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.frequency', 'monthly')
            ->assertJsonPath('data.target_per_period', 500000);
            
        $this->assertDatabaseHas('goals', [
            'name' => 'Save for Bike',
            'frequency' => 'monthly',
        ]);
    }

    public function test_can_add_item_to_goal()
    {
        $goal = Goal::create([
            'household_id' => $this->household->id,
            'name' => 'Test Goal',
            'target_amount' => 1000,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/households/{$this->household->id}/goals/{$goal->id}/items", [
                'title' => 'Daily saving 10k',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Daily saving 10k');
            
        $this->assertDatabaseHas('goal_items', [
            'goal_id' => $goal->id,
            'title' => 'Daily saving 10k',
        ]);
    }

    public function test_can_toggle_goal_item()
    {
        $goal = Goal::create([
            'household_id' => $this->household->id,
            'name' => 'Test Goal',
            'target_amount' => 1000,
        ]);
        $item = $goal->items()->create(['title' => 'Test item', 'is_completed' => false]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/households/{$this->household->id}/goals/{$goal->id}/items/{$item->id}/toggle");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_completed', true);
            
        $this->assertTrue($item->fresh()->is_completed);
    }
}
