<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillReminder;
use App\Models\Household;
use Illuminate\Http\Request;

class BillReminderController extends Controller
{
    public function index($householdId)
    {
        $household = Household::findOrFail($householdId);
        $reminders = $household->billReminders()->with('category')->get();
        return response()->json(['data' => $reminders]);
    }

    public function store(Request $request, $householdId)
    {
        $household = Household::findOrFail($householdId);
        
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'repeat_type' => 'required|in:none,monthly,yearly',
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
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'repeat_type' => 'required|in:none,monthly,yearly',
            'is_paid' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $wasNotPaid = !$billReminder->is_paid;
        $willBePaid = $request->input('is_paid', false);

        $billReminder->update($validated);

        // Auto-renew the bill if it's recurring and just got paid
        if ($wasNotPaid && $willBePaid) {
            $newDueDate = null;
            if ($billReminder->repeat_type === 'monthly') {
                $newDueDate = \Carbon\Carbon::parse($billReminder->due_date)->addMonth();
            } elseif ($billReminder->repeat_type === 'yearly') {
                $newDueDate = \Carbon\Carbon::parse($billReminder->due_date)->addYear();
            }

            if ($newDueDate) {
                $household->billReminders()->create([
                    'category_id' => $billReminder->category_id,
                    'name' => $billReminder->name,
                    'amount' => $billReminder->amount,
                    'due_date' => $newDueDate->format('Y-m-d'),
                    'repeat_type' => $billReminder->repeat_type,
                    'notes' => $billReminder->notes,
                    'is_paid' => false,
                ]);
            }
        }

        return response()->json(['data' => $billReminder]);
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
}
