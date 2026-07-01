<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\GoalController;
use App\Http\Controllers\Api\HouseholdController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\SummaryController;
use App\Http\Controllers\Api\BillReminderController;
use App\Http\Controllers\Api\ReceiptGroupController;
use App\Http\Controllers\Api\EmailSyncController;
use App\Http\Controllers\Api\PocketController;
use App\Http\Controllers\Api\PlannerController;
use App\Http\Controllers\Api\N8nController;
use App\Http\Controllers\Api\PlanController;
use App\Http\Controllers\Api\WalletLinkController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Google Auth (Login)
Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

// Gmail OAuth Callback (public, stateless redirect)
Route::get('/email-sync/callback', [EmailSyncController::class, 'callback']);

// n8n integration (token-authenticated, no user session) — WhatsApp bot -> n8n -> app
Route::prefix('n8n')->middleware('n8n.token')->group(function () {
    Route::get('/ping', [N8nController::class, 'ping']);
    Route::post('/parse-text', [N8nController::class, 'parseText']);
    Route::get('/households/{householdId}/wallets', [N8nController::class, 'wallets']);
    Route::get('/households/{householdId}/summary', [N8nController::class, 'summary']);
    Route::post('/households/{householdId}/transactions', [N8nController::class, 'createTransaction']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::put('/user', [AuthController::class, 'updateProfile']);

    // Households
    Route::get('/households', [HouseholdController::class, 'index']);
    Route::post('/households', [HouseholdController::class, 'store']);
    Route::post('/households/{household}/invite', [HouseholdController::class, 'invite']);
    Route::get('/households/{household}/members', [HouseholdController::class, 'members']);
    Route::put('/households/{household}/members/{userId}', [HouseholdController::class, 'updateMember']);
    Route::delete('/households/{household}/members/{userId}', [HouseholdController::class, 'removeMember']);
    // Invitation Handshake
    Route::get('/invitations', [HouseholdController::class, 'invitations']);
    Route::post('/households/{household}/accept-invite', [HouseholdController::class, 'acceptInvite']);
    Route::post('/households/{household}/reject-invite', [HouseholdController::class, 'rejectInvite']);

    // Receipt OCR
    Route::post('/receipts/scan', [\App\Http\Controllers\Api\ReceiptController::class, 'scan']);

    // Gmail Email Sync
    Route::prefix('email-sync')->group(function () {
        Route::get('/status', [EmailSyncController::class, 'status']);
        Route::post('/auth-init', [EmailSyncController::class, 'authInit']);
        Route::post('/fetch', [EmailSyncController::class, 'fetch']);
        Route::get('/pending', [EmailSyncController::class, 'pending']);
        Route::get('/history', [EmailSyncController::class, 'history']);
        Route::post('/skip/{logId}', [EmailSyncController::class, 'skip']);
        Route::delete('/disconnect', [EmailSyncController::class, 'disconnect']);
    });
    // Confirm inside household scope (needs wallet validation)
    Route::post('/households/{householdId}/email-sync/confirm/{logId}', [EmailSyncController::class, 'confirm']);

    // Household Scoped Resources
    Route::prefix('households/{householdId}')->group(function () {
        // Wallets
        Route::get('/wallets', [WalletController::class, 'index']);
        Route::post('/wallets', [WalletController::class, 'store']);
        Route::put('/wallets/{wallet}', [WalletController::class, 'update']);
        Route::delete('/wallets/{wallet}', [WalletController::class, 'destroy']);

        // Categories
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        // Transactions
        Route::get('/transactions', [TransactionController::class, 'index']);
        Route::post('/transactions', [TransactionController::class, 'store']);
        Route::put('/transactions/{transaction}', [TransactionController::class, 'update']);
        Route::post('/sync-balance', [TransactionController::class, 'syncBalance']);
        Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy']);

        // Receipt Groups
        Route::get('/receipt-groups', [ReceiptGroupController::class, 'index']);
        Route::post('/receipt-groups', [ReceiptGroupController::class, 'store']);
        Route::get('/receipt-groups/{groupId}', [ReceiptGroupController::class, 'show']);
        Route::delete('/receipt-groups/{groupId}', [ReceiptGroupController::class, 'destroy']);
        // Item price history search
        Route::get('/receipt-items/search', [ReceiptGroupController::class, 'searchItems']);

        // Goals
        Route::get('/goals', [GoalController::class, 'index']);
        Route::post('/goals', [GoalController::class, 'store']);
        Route::put('/goals/{goal}', [GoalController::class, 'update']);
        Route::delete('/goals/{goal}', [GoalController::class, 'destroy']);
        Route::post('/goals/{goal}/items', [GoalController::class, 'addItem']);
        Route::post('/goals/{goal}/items/{item}/toggle', [GoalController::class, 'toggleItem']);
        Route::delete('/goals/{goal}/items/{item}', [GoalController::class, 'deleteItem']);

        // Summary
        Route::get('/summary', [SummaryController::class, 'index']);

        // Budgets
        Route::get('/budgets', [\App\Http\Controllers\BudgetController::class, 'index']);
        Route::post('/budgets', [\App\Http\Controllers\BudgetController::class, 'store']);
        Route::delete('/budgets/{budget}', [\App\Http\Controllers\BudgetController::class, 'destroy']);

        // Bill Reminders
        Route::get('/bill-reminders', [BillReminderController::class, 'index']);
        Route::post('/bill-reminders', [BillReminderController::class, 'store']);
        Route::put('/bill-reminders/{billReminder}', [BillReminderController::class, 'update']);
        Route::post('/bill-reminders/{billReminder}/pay', [BillReminderController::class, 'pay']);
        Route::delete('/bill-reminders/{billReminder}', [BillReminderController::class, 'destroy']);

        // Pockets (Kantong) — Dana Anak, tabungan, dll.
        Route::get('/pockets', [PocketController::class, 'index']);
        Route::post('/pockets', [PocketController::class, 'store']);
        Route::get('/pockets/summary', [PocketController::class, 'summary']);
        Route::put('/pockets/{pocketId}', [PocketController::class, 'update']);
        Route::post('/pockets/{pocketId}/allocate', [PocketController::class, 'allocate']);
        Route::delete('/pockets/{pocketId}', [PocketController::class, 'destroy']);

        // Planner / Simulasi cashflow
        Route::get('/planner', [PlannerController::class, 'show']);

        // Linked / shared wallets (saling terhubung antar dompet)
        Route::get('/wallet-links', [WalletLinkController::class, 'index']);
        Route::post('/wallets/{walletId}/share', [WalletLinkController::class, 'share']);
        Route::delete('/wallet-links/{linkId}', [WalletLinkController::class, 'unshare']);
        Route::get('/shared-with-me', [WalletLinkController::class, 'sharedWithMe']);

        // Daily budget status (reminder feed)
        Route::get('/budget-status', [\App\Http\Controllers\BudgetController::class, 'dailyStatus']);
    });

    // SaaS — plans & subscription (per user)
    Route::get('/plans', [PlanController::class, 'index']);
    Route::get('/subscription', [PlanController::class, 'current']);
    Route::post('/subscription/subscribe', [PlanController::class, 'subscribe']);
});

