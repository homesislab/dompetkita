<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HouseholdUser;
use App\Models\Wallet;
use App\Models\WalletLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Linked / shared wallets — "saling terhubung antar dompet".
 * A household can share one of its wallets with another household
 * (view-only or spend permission).
 */
class WalletLinkController extends Controller
{
    /** Wallets this household has shared out to others. */
    public function index(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $links = WalletLink::with(['wallet:id,name,type,balance', 'sharedHousehold:id,name'])
            ->where('owner_household_id', $householdId)
            ->get();

        return response()->json(['success' => true, 'data' => $links]);
    }

    /** Share a wallet owned by this household with another household. */
    public function share(Request $request, $householdId, $walletId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $validated = $request->validate([
            'shared_household_id' => 'required|exists:households,id',
            'permission' => 'nullable|in:view,spend',
        ]);

        if ((string) $validated['shared_household_id'] === (string) $householdId) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa membagikan dompet ke household yang sama.',
            ], 422);
        }

        $wallet = Wallet::where('id', $walletId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $link = WalletLink::updateOrCreate(
            [
                'wallet_id' => $wallet->id,
                'shared_household_id' => $validated['shared_household_id'],
            ],
            [
                'owner_household_id' => $householdId,
                'permission' => $validated['permission'] ?? 'view',
                'created_by' => $request->user()->id,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Dompet berhasil dibagikan.',
            'data' => $link,
        ], 201);
    }

    /** Stop sharing a wallet (remove a link owned by this household). */
    public function unshare(Request $request, $householdId, $linkId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $link = WalletLink::where('id', $linkId)
            ->where('owner_household_id', $householdId)
            ->firstOrFail();

        $link->delete();

        return response()->json(['success' => true, 'message' => 'Berbagi dompet dihentikan.']);
    }

    /** Wallets shared TO this household by others. */
    public function sharedWithMe(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $links = WalletLink::with(['wallet:id,name,type,balance', 'ownerHousehold:id,name'])
            ->where('shared_household_id', $householdId)
            ->get();

        return response()->json(['success' => true, 'data' => $links]);
    }

    private function authorizeHousehold($userId, $householdId): void
    {
        $exists = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $userId)
            ->exists();

        if (!$exists) {
            abort(403, 'Unauthorized access to this household.');
        }
    }
}
