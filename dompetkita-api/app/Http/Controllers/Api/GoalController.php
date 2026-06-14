<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Goal;
use App\Models\GoalItem;
use App\Models\HouseholdUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoalController extends Controller
{
    /**
     * Get all goals for a household.
     */
    public function index(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $goals = Goal::where('household_id', $householdId)
            ->with('items')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $goals
        ]);
    }

    /**
     * Create a new financial goal.
     */
    public function store(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'name' => 'required|string|max:255',
            'target_amount' => 'required|numeric|min:0',
            'current_amount' => 'numeric|min:0',
            'color' => 'nullable|string',
            'deadline' => 'nullable|date',
            'frequency' => 'nullable|string|in:none,daily,weekly,monthly,yearly',
            'target_per_period' => 'nullable|numeric|min:0',
        ]);

        $goal = Goal::create([
            'household_id' => $householdId,
            'name' => $request->name,
            'target_amount' => $request->target_amount,
            'current_amount' => $request->current_amount ?? 0,
            'color' => $request->color,
            'deadline' => $request->deadline,
            'frequency' => $request->frequency ?? 'none',
            'target_per_period' => $request->target_per_period,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Goal created successfully',
            'data' => $goal->load('items')
        ], 201);
    }

    /**
     * Update a goal.
     */
    public function update(Request $request, $householdId, $goalId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $goal = Goal::where('id', $goalId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'target_amount' => 'sometimes|required|numeric|min:0',
            'current_amount' => 'sometimes|required|numeric|min:0',
            'color' => 'nullable|string',
            'deadline' => 'nullable|date',
            'frequency' => 'nullable|string|in:none,daily,weekly,monthly,yearly',
            'target_per_period' => 'nullable|numeric|min:0',
        ]);

        $goal->update($request->only([
            'name', 'target_amount', 'current_amount', 'color', 'deadline', 'frequency', 'target_per_period'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Goal updated successfully',
            'data' => $goal->load('items')
        ]);
    }

    /**
     * Delete a goal.
     */
    public function destroy(Request $request, $householdId, $goalId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $goal = Goal::where('id', $goalId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $goal->delete();

        return response()->json([
            'success' => true,
            'message' => 'Goal deleted successfully'
        ]);
    }

    /**
     * Add an item to a goal.
     */
    public function addItem(Request $request, $householdId, $goalId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $goal = Goal::where('id', $goalId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $item = $goal->items()->create([
            'title' => $request->title,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item added successfully',
            'data' => $item
        ], 201);
    }

    /**
     * Toggle a goal item status.
     */
    public function toggleItem(Request $request, $householdId, $goalId, $itemId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $item = GoalItem::where('id', $itemId)
            ->where('goal_id', $goalId)
            ->whereHas('goal', function ($q) use ($householdId) {
                $q->where('household_id', $householdId);
            })
            ->firstOrFail();

        $item->update([
            'is_completed' => !$item->is_completed
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully',
            'data' => $item
        ]);
    }

    /**
     * Delete a goal item.
     */
    public function deleteItem(Request $request, $householdId, $goalId, $itemId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $item = GoalItem::where('id', $itemId)
            ->where('goal_id', $goalId)
            ->whereHas('goal', function ($q) use ($householdId) {
                $q->where('household_id', $householdId);
            })
            ->firstOrFail();

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted successfully'
        ]);
    }

    private function authorizeHousehold($userId, $householdId)
    {
        $exists = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $userId)
            ->exists();

        if (!$exists) {
            abort(403, 'Unauthorized access to this household.');
        }
    }
}
