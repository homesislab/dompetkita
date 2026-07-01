<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillReminder;
use App\Models\Household;
use App\Models\Pocket;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillReminderController extends Controller
{
    public function index($householdId)
    {
        $household = Household::findOrFail($householdId);
        $reminders = $household->billReminders()->with(['category', 'wallet', 'pocket'])->get();
        return response()->json(['data' => $reminders]);
    }

    public function store(Request $request, $householdId)
    {
        $household = Household::findOrFail($householdId);

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'wallet_id' => 'nullable|exists:wallets,id',
            'pocket_id' => 'nullable|exists:pockets,id',
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'repeat_type' => 'required|in:none,weekly,monthly,yearly,custom',
            'repeat_interval' => 'nullable|integer|min:1',
            'auto_post' => 'nullable|boolean',
            'is_optional' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $reminder = $household->billReminders()->create($validated);

        return response()->json(['data' => $reminder], 201);
    }

    public function update(Request $request, $householdId, BillReminder $billReminder)
    {
        $household = Household::findOrFail($householdId);

        // Ensure the reminder belongs to the household
        if ($billReminder->household_id !== $household->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'wallet_id' => 'nullable|exists:wallets,id',
            'pocket_id' => 'nullable|exists:pockets,id',
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'repeat_type' => 'required|in:none,weekly,monthly,yearly,custom',
            'repeat_interval' => 'nullable|integer|min:1',
            'auto_post' => 'nullable|boolean',
            'is_optional' => 'nullable|boolean',
            'is_paid' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $wasNotPaid = !$billReminder->is_paid;
        $willBePaid = $request->input('is_paid', false);

        $billReminder->update($validated);

        // Auto-renew the bill if it's recurring and just got marked paid (no posting)
        if ($wasNotPaid && $willBePaid && $billReminder->repeat_type !== 'none') {
            $newDueDate = $this->nextDueDate($billReminder);
            if ($newDueDate) {
                $this->cloneNextOccurrence($household, $billReminder, $newDueDate);
            }
        }

        return response()->json(['data' => $billReminder]);
    }

    /**
     * Mark a bill as paid AND post a real expense transaction (deduct wallet/pocket).
     * POST /households/{householdId}/bill-reminders/{billReminder}/pay
     */
    public function pay(Request $request, $householdId, BillReminder $billReminder)
    {
        $household = Household::findOrFail($householdId);

        if ($billReminder->household_id !== $household->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'wallet_id' => 'nullable|exists:wallets,id',
            'transaction_date' => 'nullable|date',
        ]);

        $walletId = $validated['wallet_id'] ?? $billReminder->wallet_id;
        if (!$walletId) {
            return response()->json([
                'success' => false,
                'message' => 'wallet_id wajib diisi untuk mencatat pembayaran.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($request, $householdId, $billReminder, $walletId, $household) {
                $this->postBillTransaction(
                    $billReminder,
                    $householdId,
                    $walletId,
                    $request->user()->id,
                    $request->transaction_date
                );

                $billReminder->is_paid = true;
                $billReminder->save();

                if ($billReminder->repeat_type !== 'none') {
                    $newDueDate = $this->nextDueDate($billReminder);
                    if ($newDueDate) {
                        $this->cloneNextOccurrence($household, $billReminder, $newDueDate);
                    }
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Tagihan dibayar & transaksi tercatat.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membayar tagihan: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function destroy($householdId, BillReminder $billReminder)
    {
        $household = Household::findOrFail($householdId);

        // Ensure the reminder belongs to the household
        if ($billReminder->household_id !== $household->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $billReminder->delete();

        return response()->json(null, 204);
    }

    // ---- Shared helpers (also used by the bills:generate command) ----

    /**
     * Post a real expense transaction for a bill, deducting wallet (and pocket if set).
     */
    public function postBillTransaction(BillReminder $bill, $householdId, $walletId, $userId, $date = null): Transaction
    {
        $wallet = Wallet::where('id', $walletId)
            ->where('household_id', $householdId)
            ->lockForUpdate()
            ->firstOrFail();
        $wallet->balance -= (float) $bill->amount;
        $wallet->save();

        if ($bill->pocket_id) {
            $pocket = Pocket::where('id', $bill->pocket_id)
                ->where('household_id', $householdId)
                ->lockForUpdate()
                ->firstOrFail();
            $pocket->balance -= (float) $bill->amount;
            $pocket->save();
        }

        return Transaction::create([
            'household_id' => $householdId,
            'user_id' => $userId,
            'type' => 'expense',
            'amount' => $bill->amount,
            'admin_fee' => 0,
            'wallet_id' => $walletId,
            'to_wallet_id' => null,
            'category_id' => $bill->category_id,
            'description' => 'Tagihan: ' . $bill->name,
            'transaction_date' => $date ?? now(),
        ]);
    }

    /**
     * Compute the next due date for a recurring bill (null when non-recurring).
     */
    public function nextDueDate(BillReminder $bill): ?\Carbon\Carbon
    {
        $due = \Carbon\Carbon::parse($bill->due_date);
        $n = max(1, (int) ($bill->repeat_interval ?? 1));

        return match ($bill->repeat_type) {
            'weekly'  => $due->copy()->addWeeks($n),
            'monthly' => $due->copy()->addMonthsNoOverflow($n),
            'yearly'  => $due->copy()->addYears($n),
            'custom'  => $due->copy()->addDays($n),
            default   => null,
        };
    }

    private function cloneNextOccurrence(Household $household, BillReminder $bill, \Carbon\Carbon $newDueDate): void
    {
        $household->billReminders()->create([
            'category_id' => $bill->category_id,
            'wallet_id' => $bill->wallet_id,
            'pocket_id' => $bill->pocket_id,
            'name' => $bill->name,
            'amount' => $bill->amount,
            'due_date' => $newDueDate->format('Y-m-d'),
            'repeat_type' => $bill->repeat_type,
            'repeat_interval' => $bill->repeat_interval,
            'auto_post' => $bill->auto_post,
            'is_optional' => $bill->is_optional,
            'notes' => $bill->notes,
            'is_paid' => false,
        ]);
    }
}
