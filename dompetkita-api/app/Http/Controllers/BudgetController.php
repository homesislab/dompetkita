<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Budget;
use App\Models\HouseholdUser;
use Illuminate\Http\JsonResponse;

class BudgetController extends Controller
{
    public function index(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $budgets = Budget::where('household_id', $householdId)
            ->with('category')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $budgets
        ]);
    }

    public function store(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'amount' => 'required|numeric|min:0',
            'period' => 'required|string|in:daily,weekly,monthly,yearly,once',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $budget = Budget::updateOrCreate(
            [
                'household_id' => $householdId,
                'category_id' => $request->category_id,
            ],
            [
                'amount' => $request->amount,
                'period' => $request->period,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Budget saved successfully',
            'data' => $budget->load('category')
        ]);
    }

    public function destroy(Request $request, $householdId, $budgetId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $budget = Budget::where('id', $budgetId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $budget->delete();

        return response()->json([
            'success' => true,
            'message' => 'Budget deleted successfully'
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
