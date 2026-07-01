<?php

namespace App\Console\Commands;

use App\Models\Budget;
use App\Services\BudgetReminderService;
use App\Services\N8nNotifier;
use Illuminate\Console\Command;

/**
 * Daily budget reminder. For every household with budgets, computes today's
 * status per category and pushes an alert (over / warning) to the n8n webhook
 * so it can be forwarded to WhatsApp / email / etc.
 *
 * Scheduled in routes/console.php (Schedule::command('budgets:remind')).
 */
class SendDailyBudgetReminders extends Command
{
    protected $signature = 'budgets:remind';

    protected $description = 'Send daily budget reminders (over/warning) to the configured n8n webhook';

    public function handle(BudgetReminderService $service): int
    {
        $householdIds = Budget::query()->distinct()->pluck('household_id');

        $sent = 0;
        foreach ($householdIds as $householdId) {
            $report = $service->report($householdId);
            $alerts = array_values(array_filter($report, fn ($r) => in_array($r['status'], ['over', 'warning'])));

            if (empty($alerts)) {
                continue;
            }

            N8nNotifier::dispatch('budget.daily_reminder', [
                'household_id' => $householdId,
                'date' => now()->toDateString(),
                'alerts' => $alerts,
            ]);

            $sent++;
            $this->info("Household {$householdId}: " . count($alerts) . ' budget alert(s) sent.');
        }

        $this->info("Done. {$sent} household(s) notified.");
        return self::SUCCESS;
    }
}
