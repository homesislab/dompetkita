<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    /** List all active SaaS plans. */
    public function index(): JsonResponse
    {
        $plans = Plan::where('is_active', true)->orderBy('sort_order')->get();
        return response()->json(['success' => true, 'data' => $plans]);
    }

    /** Current user's subscription (falls back to the Free plan). */
    public function current(Request $request): JsonResponse
    {
        $sub = Subscription::with('plan')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->first();

        if (!$sub) {
            $free = Plan::where('slug', 'free')->first();
            return response()->json(['success' => true, 'data' => [
                'status' => 'none',
                'plan' => $free,
                'is_active' => true,
            ]]);
        }

        return response()->json(['success' => true, 'data' => [
            'status' => $sub->status,
            'plan' => $sub->plan,
            'starts_at' => $sub->starts_at,
            'ends_at' => $sub->ends_at,
            'trial_ends_at' => $sub->trial_ends_at,
            'is_active' => $sub->isActive(),
        ]]);
    }

    /**
     * Subscribe / change plan.
     *
     * NOTE: This does NOT process a payment. Activation is immediate so the
     * flow can be driven by a payment gateway or an n8n workflow that calls
     * this endpoint after confirming payment (pass provider + external_ref).
     */
    public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => 'required_without:plan_slug|exists:plans,id',
            'plan_slug' => 'required_without:plan_id|exists:plans,slug',
            'provider' => 'nullable|string',
            'external_ref' => 'nullable|string',
        ]);

        $plan = isset($validated['plan_id'])
            ? Plan::findOrFail($validated['plan_id'])
            : Plan::where('slug', $validated['plan_slug'])->firstOrFail();

        $startsAt = now();
        $endsAt = match ($plan->interval) {
            'yearly' => $startsAt->copy()->addYear(),
            'lifetime' => null,
            default => $startsAt->copy()->addMonth(),
        };

        $sub = Subscription::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'plan_id' => $plan->id,
                'status' => 'active',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'provider' => $validated['provider'] ?? null,
                'external_ref' => $validated['external_ref'] ?? null,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Langganan aktif.',
            'data' => $sub->load('plan'),
        ], 201);
    }
}
