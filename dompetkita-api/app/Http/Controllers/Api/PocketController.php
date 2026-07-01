<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HouseholdUser;
use App\Models\Pocket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PocketController extends Controller
{
    public function index(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $pockets = Pocket::where('household_id', $householdId)->orderBy('name')->get();

        return response()->json(['data' => $pockets]);
    }

    public function store(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:child,saving,operational,general',
            'beneficiary' => 'nullable|string|max:255',
            'balance' => 'nullable|numeric|min:0',
            'is_protected' => 'nullable|boolean',
            'allowed_category_ids' => 'nullable|array',
            'allowed_category_ids.*' => 'integer|exists:categories,id',
            'icon' => 'nullable|string',
            'color' => 'nullable|string',
        ]);

        $validated['household_id'] = $householdId;
        $validated['balance'] = $validated['balance'] ?? 0;

        $pocket = Pocket::create($validated);

        return response()->json(['data' => $pocket], 201);
    }

    public function update(Request $request, $householdId, $pocketId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $pocket = Pocket::where('id', $pocketId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:child,saving,operational,general',
            'beneficiary' => 'nullable|string|max:255',
            'is_protected' => 'nullable|boolean',
            'allowed_category_ids' => 'nullable|array',
            'allowed_category_ids.*' => 'integer|exists:categories,id',
            'icon' => 'nullable|string',
            'color' => 'nullable|string',
        ]);

        $pocket->update($validated);

        return response()->json(['data' => $pocket]);
    }

    public function destroy(Request $request, $householdId, $pocketId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $pocket = Pocket::where('id', $pocketId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        if ($pocket->is_protected && (float) $pocket->balance > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Kantong terlindungi dengan saldo tidak boleh dihapus.',
            ], 400);
        }

        $pocket->delete();

        return response()->json(null, 204);
    }

    /**
     * Top up / adjust a pocket balance (money moved INTO the pocket).
     * POST /households/{householdId}/pockets/{pocketId}/allocate  { amount }
     */
    public function allocate(Request $request, $householdId, $pocketId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $validated = $request->validate([
            'amount' => 'required|numeric',
        ]);

        $pocket = DB::transaction(function () use ($pocketId, $householdId, $validated) {
            $p = Pocket::where('id', $pocketId)
                ->where('household_id', $householdId)
                ->lockForUpdate()
                ->firstOrFail();
            $p->balance += (float) $validated['amount'];
            $p->save();
            return $p;
        });

        return response()->json(['data' => $pocket]);
    }

    public function summary(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $pockets = Pocket::where('household_id', $householdId)
            ->get(['id', 'name', 'type', 'beneficiary', 'balance', 'is_protected']);

        return response()->json(['data' => [
            'total' => (float) $pockets->sum('balance'),
            'pockets' => $pockets,
        ]]);
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
