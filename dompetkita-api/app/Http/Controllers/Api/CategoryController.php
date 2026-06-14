<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\HouseholdUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Get all categories for a household (including system defaults where household_id is null).
     */
    public function index(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $categories = Category::where('household_id', $householdId)
            ->orWhereNull('household_id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Categories retrieved successfully',
            'data' => $categories
        ]);
    }

    /**
     * Create a custom category for the household.
     */
    public function store(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:income,expense',
            'icon' => 'nullable|string',
            'color' => 'nullable|string'
        ]);

        $category = Category::create([
            'household_id' => $householdId,
            'name' => $request->name,
            'type' => $request->type,
            'icon' => $request->icon,
            'color' => $request->color
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'data' => $category
        ], 201);
    }

    /**
     * Update a custom category.
     */
    public function update(Request $request, $householdId, $categoryId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $category = Category::where('id', $categoryId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $request->validate([
            'name'  => 'sometimes|required|string|max:255',
            'type'  => 'sometimes|required|in:income,expense',
            'icon'  => 'nullable|string',
            'color' => 'nullable|string',
        ]);

        $category->update($request->only(['name', 'type', 'icon', 'color']));

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data'    => $category->fresh()
        ]);
    }

    /**
     * Delete a custom category.
     */
    public function destroy(Request $request, $householdId, $categoryId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $category = Category::where('id', $categoryId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully'
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
