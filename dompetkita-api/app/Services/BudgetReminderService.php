<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\Transaction;

/**
 * Computes per-category daily budget status for a household.
 * Shared by BudgetController@dailyStatus and the budgets:remind command.
 */
class BudgetReminderService
{
    public function report($householdId): array
    {
        $now = now();
        $daysInMonth = max(1, (int) $now->daysInMonth);

        $budgets = Budget::where('household_id', $householdId)->with('category')->get();
        $items = [];

        foreach ($budgets as $b) {
            $amount = (float) $b->amount;
            $allowance = match ($b->period) {
                'daily' => $amount,
                'weekly' => $amount / 7,
                'monthly' => $amount / $daysInMonth,
                'yearly' => $amount / 365,
                default => $amount, // once / unknown -> treat as flat cap
            };

            $todaySpent = (float) Transaction::where('household_id', $householdId)
                ->where('type', 'expense')
                ->where('category_id', $b->category_id)
                ->whereDate('transaction_date', $now->toDateString())
                ->sum('amount');

            $status = 'ok';
            if ($allowance > 0) {
                if ($todaySpent > $allowance) {
                    $status = 'over';
                } elseif ($todaySpent >= 0.8 * $allowance) {
                    $status = 'warning';
                }
            }

            $items[] = [
                'budget_id' => $b->id,
                'category_id' => $b->category_id,
                'category' => $b->category->name ?? null,
                'period' => $b->period,
                'amount' => $amount,
                'daily_allowance' => round($allowance, 2),
                'today_spent' => round($todaySpent, 2),
                'remaining_today' => round($allowance - $todaySpent, 2),
                'status' => $status,
            ];
        }

        return $items;
    }
}
