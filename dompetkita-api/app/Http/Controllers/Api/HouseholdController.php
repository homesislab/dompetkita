<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\HouseholdUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HouseholdController extends Controller
{
    /**
     * Get all households the authenticated user belongs to.
     */
    public function index(Request $request): JsonResponse
    {
        $households = $request->user()->households()->withPivot('role')->get();
        return response()->json([
            'success' => true,
            'message' => 'Households retrieved successfully',
            'data' => $households
        ]);
    }

    /**
     * Create a new household for the user.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $household = null;
        
        DB::transaction(function () use ($request, &$household) {
            $household = Household::create([
                'name' => $request->name
            ]);

            HouseholdUser::create([
                'household_id' => $household->id,
                'user_id' => $request->user()->id,
                'role' => 'admin' // Creator is inherently an admin
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Household created successfully',
            'data' => $household
        ], 201);
    }

    /**
     * Invite to household – creates a PENDING record for the invitee to accept.
     */
    public function invite(Request $request, $householdId): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'role'  => 'nullable|in:admin,member'
        ]);

        $household = Household::findOrFail($householdId);
        
        // Ensure current user is admin of this household
        $membership = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'accepted')
            ->first();

        if (!$membership || $membership->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Must be an accepted admin of this household.',
            ], 403);
        }

        $userToInvite = User::where('email', $request->email)->first();

        // Check if already a member (accepted or pending)
        $existing = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $userToInvite->id)
            ->first();

        if ($existing) {
            $msg = $existing->status === 'pending'
                ? 'User sudah diundang dan menunggu persetujuan.'
                : 'User sudah menjadi anggota keluarga ini.';
             return response()->json([
                'success' => false,
                'message' => $msg,
            ], 400);
        }

        HouseholdUser::create([
            'household_id' => $householdId,
            'user_id'      => $userToInvite->id,
            'role'         => $request->role ?? 'member',
            'status'       => 'pending',  // <-- now starts as pending
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Undangan berhasil dikirim. Menunggu persetujuan dari pengguna.',
            'data'    => [
                'name'   => $userToInvite->name,
                'email'  => $userToInvite->email,
                'role'   => $request->role ?? 'member',
                'status' => 'pending',
            ],
        ], 200);
    }

    /**
     * List all PENDING invitations for the logged-in user.
     */
    public function invitations(Request $request): JsonResponse
    {
        $pending = HouseholdUser::with('household')
            ->where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->get()
            ->map(fn($m) => [
                'household_id'   => $m->household_id,
                'household_name' => $m->household->name,
                'role'           => $m->role,
                'invited_at'     => $m->created_at->toDateTimeString(),
            ]);

        return response()->json(['success' => true, 'data' => $pending]);
    }

    /**
     * Accept a pending invitation.
     */
    public function acceptInvite(Request $request, $householdId): JsonResponse
    {
        $record = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->first();

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Undangan tidak ditemukan.'], 404);
        }

        $record->update(['status' => 'accepted']);

        return response()->json([
            'success' => true,
            'message' => 'Undangan berhasil diterima. Anda kini adalah anggota keluarga!',
            'data'    => ['household_id' => $householdId, 'role' => $record->role],
        ]);
    }

    /**
     * Reject (decline) a pending invitation.
     */
    public function rejectInvite(Request $request, $householdId): JsonResponse
    {
        $record = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->first();

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Undangan tidak ditemukan.'], 404);
        }

        $record->delete();

        return response()->json(['success' => true, 'message' => 'Undangan berhasil ditolak.']);
    }

    /**
     * List all members of a household.
     */
    public function members(Request $request, $householdId): JsonResponse
    {
        // Only accepted members can see the list
        $membership = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'accepted')
            ->exists();

        if (!$membership) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $members = HouseholdUser::with('user')
            ->where('household_id', $householdId)
            ->get()
            ->map(fn($m) => [
                'id'         => $m->user->id,
                'name'       => $m->user->name,
                'email'      => $m->user->email,
                'role'       => $m->role,
                'status'     => $m->status,
                'joined_at'  => $m->created_at->toDateString(),
            ]);

        $household = Household::findOrFail($householdId);

        return response()->json([
            'success' => true,
            'data'    => [
                'household' => $household,
                'members'   => $members,
            ]
        ]);
    }

    /**
     * Update a member's role in the household (admin only, cannot modify self).
     */
    public function updateMember(Request $request, $householdId, $userId): JsonResponse
    {
        $request->validate([
            'role' => 'required|in:admin,member',
        ]);

        $myMembership = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'accepted')
            ->first();

        if (!$myMembership || $myMembership->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Admin access required'], 403);
        }

        if ($request->user()->id == $userId) {
            return response()->json(['success' => false, 'message' => 'You cannot modify your own role'], 400);
        }

        $target = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $userId)
            ->first();

        if (!$target) {
            return response()->json(['success' => false, 'message' => 'Member not found'], 404);
        }

        $target->update(['role' => $request->role]);

        return response()->json([
            'success' => true,
            'message' => 'Member role updated successfully',
            'data'    => ['user_id' => $userId, 'role' => $request->role],
        ]);
    }

    /**
     * Remove a member from the household (admin only, cannot remove self).
     */
    public function removeMember(Request $request, $householdId, $userId): JsonResponse
    {
        $myMembership = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$myMembership || $myMembership->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Admin access required'], 403);
        }

        if ($request->user()->id == $userId) {
            return response()->json(['success' => false, 'message' => 'You cannot remove yourself'], 400);
        }

        $removed = HouseholdUser::where('household_id', $householdId)
            ->where('user_id', $userId)
            ->delete();

        if (!$removed) {
            return response()->json(['success' => false, 'message' => 'Member not found'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Member removed successfully']);
    }
}
