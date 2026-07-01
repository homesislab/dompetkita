<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillReminder;
use App\Models\Goal;
use App\Models\HouseholdUser;
use App\Models\Pocket;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlannerController extends Controller
{
    public function show(Request $request, $householdId): JsonResponse
    {
        $this->authorizeHousehold($request->user()->id, $householdId);

        $month = $request->query('month', now()->format('Y-m'));
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        // Income plan: use ?income= if provided, else realized income for the month
        $incomePlan = $request->query('income');
        if ($incomePlan === null) {
            $incomePlan = Transaction::where('household_id', $householdId)
                ->where('type', 'income')
                ->whereBetween('transaction_date', [$start, $end])
                ->sum('amount');
        }
        $incomePlan = (float) $incomePlan;

        // Normalize bills to number of occurrences in the target month
        $bills = BillReminder::where('household_id', $householdId)->get();
        $mandatory = 0.0;
        $optional = [];
        foreach ($bills as $bill) {
            $occ = $this->occurrencesInMonth($bill, $start, $end);
            if ($occ <= 0) {
                continue;
            }
            $monthlyTotal = $occ * (float) $bill->amount;
            if ($bill->is_optional) {
                $optional[] = [
                    'id' => $bill->id,
                    'name' => $bill->name,
                    'occurrences' => $occ,
                    'monthly' => $monthlyTotal,
                ];
            } else {
                $mandatory += $monthlyTotal;
            }
        }

        // Extra mandatory (e.g. school shortfall) via ?extra_mandatory=
        $extraMandatory = (float) $request->query('extra_mandatory', 0);
        $mandatoryTotal = $mandatory + $extraMandatory;

        $optionalTotal = array_sum(array_column($optional, 'monthly'));
        $projectedLeftover = $incomePlan - $mandatoryTotal;
        $leftoverIfAllOptional = $projectedLeftover - $optionalTotal;

        // Suggested allocation: active monthly goals
        $goals = Goal::where('household_id', $householdId)
            ->where('frequency', 'monthly')
            ->get(['id', 'name', 'target_per_period', 'current_amount', 'target_amount']);

        // Pocket context (child funds etc.)
        $pockets = Pocket::where('household_id', $householdId)
            ->get(['id', 'name', 'type', 'beneficiary', 'balance', 'is_protected']);

        return response()->json(['data' => [
            'month' => $month,
            'income_plan' => $incomePlan,
            'mandatory' => [
                'recurring' => $mandatory,
                'extra' => $extraMandatory,
                'total' => $mandatoryTotal,
            ],
            'optional' => $optional,
            'optional_total' => $optionalTotal,
            'projected_leftover' => $projectedLeftover,
            'leftover_if_all_optional' => $leftoverIfAllOptional,
            'suggested_allocation' => $goals,
            'pockets' => $pockets,
        ]]);
    }

    private function occurrencesInMonth(BillReminder $bill, Carbon $start, Carbon $end): int
    {
        $due = Carbon::parse($bill->due_date);
        $n = max(1, (int) ($bill->repeat_interval ?? 1));

        if (($bill->repeat_type ?? 'none') === 'none') {
            return $due->betweenIncluded($start, $end) ? 1 : 0;
        }

        $count = 0;
        $cursor = $due->copy();
        $guard = 0;
        while ($cursor->lt($start) && $guard < 5000) {
            $cursor = $this->step($cursor, $bill->repeat_type, $n);
            $guard++;
        }
        while ($cursor->lte($end) && $guard < 10000) {
            $count++;
            $cursor = $this->step($cursor, $bill->repeat_type, $n);
            $guard++;
        }
        return $count;
    }

    private function step(Carbon $d, string $type, int $n): Carbon
    {
        return match ($type) {
            'weekly'  => $d->copy()->addWeeks($n),
            'monthly' => $d->copy()->addMonthsNoOverflow($n),
            'yearly'  => $d->copy()->addYears($n),
            'custom'  => $d->copy()->addDays($n),
            default   => $d->copy()->addYears(100),
        };
    }

    private function authorizeHousehold($userId, $householdId): void
    {
        $member = HouseholdUser::where('user_id', $userId)
            ->where('household_id', $householdId)->exists();
        abort_unless($member, 403, 'Anda tidak memiliki akses ke household ini.');
    }
}
