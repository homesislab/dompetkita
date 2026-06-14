<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HouseholdUser;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SummaryController extends Controller
{
    /**
     * Get dashboard summary for the household.
     */
    public function index(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $currentMonth = now()->format('Y-m');

        // Total active balance across all wallets
        $totalBalance = Wallet::where('household_id', $householdId)->sum('balance');

        // Wallet balances breakdown
        $wallets = Wallet::where('household_id', $householdId)
            ->select('id', 'name', 'type', 'balance')
            ->get();

        // Monthly expenses summary per category
        $expensesByCategory = Transaction::with('category')
            ->where('household_id', $householdId)
            ->where('type', 'expense')
            ->where('transaction_date', 'like', $currentMonth . '%')
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->get();

        // Budgets for this household
        $budgets = \App\Models\Budget::where('household_id', $householdId)->get()->keyBy('category_id');

        $categoryStats = $expensesByCategory->map(function ($transaction) use ($budgets) {
            $budget = $budgets->get($transaction->category_id);
            return [
                'category_id' => $transaction->category_id,
                'category' => $transaction->category->name ?? 'Uncategorized',
                'icon' => $transaction->category->icon ?? null,
                'color' => $transaction->category->color ?? null,
                'total' => $transaction->total,
                'budget' => $budget ? $budget->amount : null,
                'progress' => $budget ? round(($transaction->total / $budget->amount) * 100) : null
            ];
        });

        // Summary of who spent what this month
        $expensesByUser = Transaction::with('user')
            ->where('household_id', $householdId)
            ->where('type', 'expense')
            ->where('transaction_date', 'like', $currentMonth . '%')
            ->selectRaw('user_id, SUM(amount) as total')
            ->groupBy('user_id')
            ->get()
            ->map(function ($transaction) {
                 return [
                    'user' => $transaction->user->name,
                    'total' => $transaction->total
                 ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'total_balance' => $totalBalance,
                'wallets' => $wallets,
                'expenses_by_category' => $categoryStats,
                'expenses_by_user' => $expensesByUser,
                'monthly_budget' => $budgets->sum('amount'),
                'monthly_expense' => $expensesByCategory->sum('total')
            ]
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
