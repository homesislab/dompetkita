<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HouseholdUser;
use App\Models\ReceiptGroup;
use App\Models\ReceiptItem;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiptGroupController extends Controller
{
    /**
     * List all receipt groups for a household.
     */
    public function index(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $groups = ReceiptGroup::with(['items', 'wallet', 'transaction'])
            ->where('household_id', $householdId)
            ->orderBy('purchase_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $groups]);
    }

    /**
     * Show a single receipt group with all items.
     */
    public function show(Request $request, $householdId, $groupId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $group = ReceiptGroup::with(['items', 'wallet', 'transaction.category'])
            ->where('household_id', $householdId)
            ->findOrFail($groupId);

        return response()->json(['success' => true, 'data' => $group]);
    }

    /**
     * Create a receipt group (with items) and its linked transaction atomically.
     */
    public function store(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'wallet_id'     => 'required|exists:wallets,id',
            'store_name'    => 'nullable|string|max:255',
            'purchase_date' => 'required|date',
            'total_amount'  => 'required|numeric|min:0.01',
            'notes'         => 'nullable|string',
            'category_id'   => 'nullable|exists:categories,id',
            'image_path'    => 'nullable|string',
            'items'         => 'nullable|array',
            'items.*.name'        => 'required|string|max:255',
            'items.*.quantity'    => 'required|numeric|min:0',
            'items.*.unit'        => 'nullable|string|max:50',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.total_price' => 'required|numeric|min:0',
        ]);

        try {
            DB::transaction(function () use ($request, $householdId, &$group) {
                // Deduct wallet balance
                $wallet = Wallet::where('id', $request->wallet_id)
                    ->where('household_id', $householdId)
                    ->lockForUpdate()
                    ->firstOrFail();

                $wallet->balance -= $request->total_amount;
                $wallet->save();

                // Create the receipt group
                $group = ReceiptGroup::create([
                    'household_id'  => $householdId,
                    'wallet_id'     => $request->wallet_id,
                    'store_name'    => $request->store_name,
                    'purchase_date' => $request->purchase_date,
                    'total_amount'  => $request->total_amount,
                    'notes'         => $request->notes,
                    'image_path'    => $request->image_path,
                ]);

                // Create items
                if (!empty($request->items)) {
                    foreach ($request->items as $item) {
                        ReceiptItem::create([
                            'receipt_group_id' => $group->id,
                            'name'        => $item['name'],
                            'quantity'    => $item['quantity'],
                            'unit'        => $item['unit'] ?? null,
                            'unit_price'  => $item['unit_price'],
                            'total_price' => $item['total_price'],
                        ]);
                    }
                }

                // Create the linked transaction
                $storeName = $request->store_name ?: 'Receipt';
                $itemCount = count($request->items ?? []);
                $desc = $storeName . ($itemCount > 0 ? " ({$itemCount} items)" : '');

                Transaction::create([
                    'household_id'     => $householdId,
                    'user_id'          => $request->user()->id,
                    'type'             => 'expense',
                    'amount'           => $request->total_amount,
                    'wallet_id'        => $request->wallet_id,
                    'to_wallet_id'     => null,
                    'category_id'      => $request->category_id,
                    'description'      => $desc,
                    'receipt_group_id' => $group->id,
                    'transaction_date' => $request->purchase_date,
                    'image_path'       => $request->image_path,
                ]);
            });

            $group->load(['items', 'wallet', 'transaction']);

            return response()->json([
                'success' => true,
                'message' => 'Receipt saved successfully',
                'data'    => $group,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save receipt: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete a receipt group (unlinks transaction, reverses wallet balance).
     */
    public function destroy(Request $request, $householdId, $groupId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $group = ReceiptGroup::with('transaction')
            ->where('household_id', $householdId)
            ->findOrFail($groupId);

        try {
            DB::transaction(function () use ($group, $householdId) {
                // Reverse wallet balance using the linked transaction
                if ($group->transaction) {
                    $wallet = Wallet::where('id', $group->wallet_id)
                        ->where('household_id', $householdId)
                        ->lockForUpdate()
                        ->firstOrFail();
                    $wallet->balance += $group->total_amount;
                    $wallet->save();
                    $group->transaction->delete();
                }
                $group->delete(); // items cascade deleted
            });

            return response()->json(['success' => true, 'message' => 'Receipt deleted']);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Search item price history across all receipts in a household.
     * GET /households/{id}/receipt-items/search?name=sabun
     */
    public function searchItems(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $query = $request->get('name', '');
        if (strlen($query) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $items = ReceiptItem::whereHas('receiptGroup', function ($q) use ($householdId) {
                $q->where('household_id', $householdId);
            })
            ->with(['receiptGroup:id,store_name,purchase_date,wallet_id'])
            ->where('name', 'LIKE', "%{$query}%")
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($item) {
                return [
                    'id'           => $item->id,
                    'name'         => $item->name,
                    'quantity'     => $item->quantity,
                    'unit'         => $item->unit,
                    'unit_price'   => $item->unit_price,
                    'total_price'  => $item->total_price,
                    'store_name'   => $item->receiptGroup->store_name,
                    'purchase_date'=> $item->receiptGroup->purchase_date,
                ];
            });

        return response()->json(['success' => true, 'data' => $items]);
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
