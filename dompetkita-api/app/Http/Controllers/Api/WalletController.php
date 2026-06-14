<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\HouseholdUser;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    /**
     * Get all wallets for a specific household.
     */
    public function index(Request $request, $householdId): JsonResponse
    {
        // Require the user to belong to this household
        $this->authorizeHousehold($request->user()->id, $householdId);

        $wallets = Wallet::with('user')->where('household_id', $householdId)->get();

        return response()->json([
            'success' => true,
            'message' => 'Wallets retrieved successfully',
            'data' => $wallets
        ]);
    }

    /**
     * Create a new wallet in the household.
     */
    public function store(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:bank,cash,e-wallet',
            'icon' => 'nullable|string',
            'color' => 'nullable|string',
            'balance' => 'numeric|min:0',
            'user_id' => 'nullable|exists:users,id'
        ]);

        if ($request->user_id) {
            $this->authorizeHousehold($request->user_id, $householdId);
        }

        $wallet = Wallet::create([
            'household_id' => $householdId,
            'user_id' => $request->user_id,
            'name' => $request->name,
            'type' => $request->type,
            'icon' => $request->icon,
            'color' => $request->color,
            'balance' => $request->balance ?? 0
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Wallet created successfully',
            'data' => $wallet
        ], 201);
    }

    /**
     * Update a wallet.
     */
    public function update(Request $request, $householdId, $walletId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $wallet = Wallet::where('id', $walletId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $request->validate([
            'name'    => 'sometimes|required|string|max:255',
            'type'    => 'sometimes|required|in:bank,cash,e-wallet',
            'icon'    => 'nullable|string',
            'color'   => 'nullable|string',
            'balance' => 'sometimes|numeric|min:0',
            'user_id' => 'nullable|exists:users,id'
        ]);

        if ($request->has('user_id') && $request->user_id) {
            $this->authorizeHousehold($request->user_id, $householdId);
        }

        $wallet->update($request->only(['name', 'type', 'icon', 'color', 'balance', 'user_id']));

        return response()->json([
            'success' => true,
            'message' => 'Wallet updated successfully',
            'data'    => $wallet->fresh()
        ]);
    }

    /**
     * Delete a wallet.
     */
    public function destroy(Request $request, $householdId, $walletId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $wallet = Wallet::where('id', $walletId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $wallet->delete();

        return response()->json([
            'success' => true,
            'message' => 'Wallet deleted successfully'
        ]);
    }

    /**
     * Helper to ensure user has access to household.
     */
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
