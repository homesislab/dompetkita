<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\BillReminderController;
use App\Models\BillReminder;
use App\Models\HouseholdUser;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GenerateRecurringBills extends Command
{
    protected $signature = 'bills:generate';

    protected $description = 'Auto-post due recurring bills that have auto_post enabled';

    public function handle(BillReminderController $controller): int
    {
        $today = Carbon::today();

        $bills = BillReminder::where('auto_post', true)
            ->where('is_paid', false)
            ->whereDate('due_date', '<=', $today)
            ->get();

        $posted = 0;

        foreach ($bills as $bill) {
            $walletId = $bill->wallet_id;
            if (!$walletId) {
                $this->warn("Lewati '{$bill->name}' (id {$bill->id}): tidak ada wallet_id.");
                continue;
            }

            // Attribute the transaction to the first household member.
            $userId = HouseholdUser::where('household_id', $bill->household_id)->value('user_id');
            if (!$userId) {
                $this->warn("Lewati '{$bill->name}': household tanpa anggota.");
                continue;
            }

            try {
                DB::transaction(function () use ($controller, $bill, $walletId, $userId, $today, &$posted) {
                    // Catch-up loop: post every missed occurrence up to today.
                    $guard = 0;
                    while (Carbon::parse($bill->due_date)->lte($today) && $guard < 60) {
                        $controller->postBillTransaction(
                            $bill,
                            $bill->household_id,
                            $walletId,
                            $userId,
                            $bill->due_date
                        );
                        $posted++;

                        $next = $controller->nextDueDate($bill);
                        if (!$next) {
                            $bill->is_paid = true;
                            $bill->last_generated_date = $today;
                            $bill->save();
                            break;
                        }

                        $bill->due_date = $next->format('Y-m-d');
                        $bill->last_generated_date = $today;
                        $bill->save();
                        $guard++;
                    }
                });
            } catch (\Exception $e) {
                $this->error("Gagal '{$bill->name}': " . $e->getMessage());
            }
        }

        $this->info("Selesai. {$posted} transaksi tagihan diposting.");

        return self::SUCCESS;
    }
}
