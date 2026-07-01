<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HouseholdUser;
use App\Models\Pocket;
use App\Models\Transaction;
use App\Models\TransactionAllocation;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    /**
     * List all transactions for a household.
     */
    public function index(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $transactions = Transaction::with(['user', 'wallet', 'toWallet', 'category', 'receiptGroup'])
            ->where('household_id', $householdId)
            ->orderBy('transaction_date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $transactions
        ]);
    }

    /**
     * Store a new transaction atomically.
     *
     * Supports optional split funding via `allocations`: an expense can be paid
     * from several wallets and/or pockets at once. When `allocations` is omitted,
     * the classic single-wallet behavior is preserved (backward compatible).
     */
    public function store(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'type' => 'required|in:income,expense,transfer',
            'amount' => 'required|numeric|min:0.01',
            'admin_fee' => 'nullable|numeric|min:0',
            'wallet_id' => 'required|exists:wallets,id',
            'to_wallet_id' => 'nullable|required_if:type,transfer|exists:wallets,id',
            'category_id' => 'nullable|exists:categories,id',
            'description' => 'nullable|string',
            'transaction_date' => 'required|date',
            'image_path' => 'nullable|string',
            'allocations' => 'nullable|array',
            'allocations.*.wallet_id' => 'required_with:allocations|exists:wallets,id',
            'allocations.*.pocket_id' => 'nullable|exists:pockets,id',
            'allocations.*.amount' => 'required_with:allocations|numeric|min:0.01',
        ]);

        try {
            DB::transaction(function () use ($request, $householdId) {
                $adminFee = (float) ($request->admin_fee ?? 0);
                $allocations = $request->input('allocations', []);

                // Record the transaction (allocations reference its id)
                $transaction = Transaction::create([
                    'household_id' => $householdId,
                    'user_id' => $request->user()->id,
                    'type' => $request->type,
                    'amount' => $request->amount,
                    'admin_fee' => $adminFee,
                    'wallet_id' => $request->wallet_id,
                    'to_wallet_id' => $request->to_wallet_id,
                    'category_id' => $request->category_id,
                    'description' => $request->description,
                    'transaction_date' => $request->transaction_date,
                    'image_path' => $request->image_path,
                ]);

                if (!empty($allocations) && $request->type === 'expense') {
                    // ---- Split funding path ----
                    $sum = 0.0;
                    foreach ($allocations as $alloc) {
                        $sum += (float) $alloc['amount'];
                    }
                    if (round($sum, 2) !== round((float) $request->amount, 2)) {
                        throw new \Exception(
                            'Total alokasi (' . $sum . ') harus sama dengan nominal transaksi (' . $request->amount . ').'
                        );
                    }

                    foreach ($allocations as $alloc) {
                        $allocWallet = Wallet::where('id', $alloc['wallet_id'])
                            ->where('household_id', $householdId)
                            ->lockForUpdate()
                            ->firstOrFail();
                        $allocWallet->balance -= (float) $alloc['amount'];
                        $allocWallet->save();

                        $pocketId = $alloc['pocket_id'] ?? null;
                        if ($pocketId) {
                            $pocket = Pocket::where('id', $pocketId)
                                ->where('household_id', $householdId)
                                ->lockForUpdate()
                                ->firstOrFail();

                            if ($pocket->is_protected && (float) $pocket->balance < (float) $alloc['amount']) {
                                throw new \Exception("Kantong '{$pocket->name}' dilindungi dan saldonya tidak cukup.");
                            }
                            $pocket->balance -= (float) $alloc['amount'];
                            $pocket->save();
                        }

                        TransactionAllocation::create([
                            'transaction_id' => $transaction->id,
                            'wallet_id' => $alloc['wallet_id'],
                            'pocket_id' => $pocketId,
                            'amount' => $alloc['amount'],
                        ]);
                    }

                    return;
                }

                // ---- Classic single-wallet path ----
                $wallet = Wallet::where('id', $request->wallet_id)
                    ->where('household_id', $householdId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($request->type === 'expense') {
                    $wallet->balance -= $request->amount;
                    $wallet->save();
                } elseif ($request->type === 'income') {
                    $wallet->balance += $request->amount;
                    $wallet->save();
                } elseif ($request->type === 'transfer') {
                    $toWallet = Wallet::where('id', $request->to_wallet_id)
                        ->where('household_id', $householdId)
                        ->lockForUpdate()
                        ->firstOrFail();

                    // Smart Transfer: source deducted (amount + admin_fee), destination receives only amount
                    $wallet->balance -= ($request->amount + $adminFee);
                    $wallet->save();

                    $toWallet->balance += $request->amount;
                    $toWallet->save();
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Transaction processed successfully'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Transaction failed: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Edit a transaction: Reverses old effect and applies new effect.
     */
    public function update(Request $request, $householdId, $transactionId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'type' => 'required|in:income,expense,transfer',
            'amount' => 'required|numeric|min:0.01',
            'admin_fee' => 'nullable|numeric|min:0',
            'wallet_id' => 'required|exists:wallets,id',
            'to_wallet_id' => 'nullable|required_if:type,transfer|exists:wallets,id',
            'category_id' => 'nullable|exists:categories,id',
            'description' => 'nullable|string',
            'transaction_date' => 'required|date',
            'image_path' => 'nullable|string',
        ]);

        $transaction = Transaction::where('id', $transactionId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        if ($transaction->type === 'adjustment') {
            return response()->json(['success' => false, 'message' => 'Cannot manually edit auto-adjustments.'], 403);
        }

        try {
            DB::transaction(function () use ($request, $transaction, $householdId) {
                // 1. REVERSE OLD TRANSACTION
                $oldWallet = Wallet::where('id', $transaction->wallet_id)
                    ->where('household_id', $householdId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($transaction->type === 'income') {
                    $oldWallet->balance -= $transaction->amount;
                } elseif ($transaction->type === 'expense') {
                    $oldWallet->balance += $transaction->amount;
                } elseif ($transaction->type === 'transfer') {
                    $oldWallet->balance += ($transaction->amount + ($transaction->admin_fee ?? 0));
                    $oldToWallet = Wallet::where('id', $transaction->to_wallet_id)
                        ->where('household_id', $householdId)
                        ->lockForUpdate()
                        ->firstOrFail();
                    $oldToWallet->balance -= $transaction->amount;
                    $oldToWallet->save();
                }
                $oldWallet->save();

                // 2. APPLY NEW TRANSACTION
                $newAdminFee = (float) ($request->admin_fee ?? 0);

                $wallet = Wallet::where('id', $request->wallet_id)
                    ->where('household_id', $householdId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($request->type === 'expense') {
                    $wallet->balance -= $request->amount;
                } elseif ($request->type === 'income') {
                    $wallet->balance += $request->amount;
                } elseif ($request->type === 'transfer') {
                    $wallet->balance -= ($request->amount + $newAdminFee);

                    $toWallet = Wallet::where('id', $request->to_wallet_id)
                        ->where('household_id', $householdId)
                        ->lockForUpdate()
                        ->firstOrFail();

                    $toWallet->balance += $request->amount;
                    $toWallet->save();
                }
                $wallet->save();

                // 3. UPDATE RECORD
                $transaction->update([
                    'type' => $request->type,
                    'amount' => $request->amount,
                    'admin_fee' => $newAdminFee,
                    'wallet_id' => $request->wallet_id,
                    'to_wallet_id' => $request->to_wallet_id,
                    'category_id' => $request->category_id,
                    'description' => $request->description,
                    'transaction_date' => $request->transaction_date,
                    'image_path' => $request->image_path,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Transaction updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update transaction: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Delete a transaction and reverse the wallet balance effect.
     */
    public function destroy(Request $request, $householdId, $transactionId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $transaction = Transaction::with(['wallet', 'toWallet'])
            ->where('id', $transactionId)
            ->where('household_id', $householdId)
            ->firstOrFail();

        try {
            DB::transaction(function () use ($transaction, $householdId) {
                $wallet = Wallet::where('id', $transaction->wallet_id)
                    ->where('household_id', $householdId)
                    ->lockForUpdate()
                    ->firstOrFail();

                // Reverse the effect
                if ($transaction->type === 'income') {
                    $wallet->balance -= $transaction->amount;
                    $wallet->save();
                } elseif ($transaction->type === 'expense') {
                    $wallet->balance += $transaction->amount;
                    $wallet->save();
                } elseif ($transaction->type === 'transfer') {
                    $wallet->balance += ($transaction->amount + ($transaction->admin_fee ?? 0));
                    $wallet->save();

                    $toWallet = Wallet::where('id', $transaction->to_wallet_id)
                        ->where('household_id', $householdId)
                        ->lockForUpdate()
                        ->firstOrFail();
                    $toWallet->balance -= $transaction->amount;
                    $toWallet->save();
                }

                $transaction->delete();
            });

            return response()->json([
                'success' => true,
                'message' => 'Transaction deleted and balances reversed'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete transaction: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Reconcile wallet balance by creating an 'adjustment' transaction.
     * POST /households/{householdId}/sync-balance
     */
    public function syncBalance(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $request->validate([
            'wallet_id'      => 'required|exists:wallets,id',
            'actual_balance' => 'required|numeric',
        ]);

        try {
            DB::transaction(function () use ($request, $householdId) {
                $wallet = Wallet::where('id', $request->wallet_id)
                    ->where('household_id', $householdId)
                    ->lockForUpdate()
                    ->firstOrFail();

                $diff = (float) $request->actual_balance - (float) $wallet->balance;

                if ($diff == 0) {
                    return; // Nothing to do
                }

                // Snap balance to actual
                $wallet->balance = (float) $request->actual_balance;
                $wallet->save();

                // Record adjustment transaction for audit trail
                Transaction::create([
                    'household_id'     => $householdId,
                    'user_id'          => $request->user()->id,
                    'type'             => 'adjustment',
                    'amount'           => abs($diff),
                    'admin_fee'        => 0,
                    'wallet_id'        => $request->wallet_id,
                    'to_wallet_id'     => null,
                    'category_id'      => null,
                    'description'      => 'Penyesuaian saldo: ' . ($diff > 0 ? '+' : '') . number_format($diff, 0, ',', '.'),
                    'transaction_date' => now(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Balance synced successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sync failed: ' . $e->getMessage()
            ], 400);
        }
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
