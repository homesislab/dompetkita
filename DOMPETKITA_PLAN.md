# Goal Description
Provide an architecture and implementation plan to build a "Money Lover" clone named **DompetKita**. This application must support multi-user accounts, shared family/household ledgers (where husband, wife, and child can collaborate), multiple wallets per household (e.g., Banks, Cash, e-Wallets), and detailed yet easy-to-understand tracking of incomes, expenses, and transfers.

## Proposed Changes

### 1. Database Schema & Architecture

#### User & Authentication
- **`users` table**: `id`, `name`, `email`, `password`.
  - Use Laravel Sanctum for API token-based authentication.

#### Household / Family (Shared Ledger)
- **`households` table**: `id`, `name` (e.g., "Keluarga Anggy").
- **`household_user` table (Pivot)**: `household_id`, `user_id`, `role` (admin, member).
  - This links a husband, wife, and child securely to the same ledger.

#### Wallets & Accounts (Dompet/Rekening)
- **`wallets` table**: `id`, `household_id`, `name` (e.g., "BCA Suami", "Dompet Tunai Istri", "Gopay Belanja"), `type` (bank, cash, e-wallet), `balance`.
  - All wallets strictly belong to the household, so members can see or spend from the designated collective pools depending on their roles.

#### Categories & Classification
- **`categories` table**: `id`, `household_id` (nullable for defaults), `name`, `type` (income, expense), `icon`, `color`.
  - Can include default categories (Pendidikan, Belanja) or custom ones created by the household.

#### Transactions
- **`transactions` table**: 
  - `id`
  - `household_id`: Ensures the transaction belongs to the family ledger.
  - `user_id`: The specific person (actor) who recorded the transaction (e.g., Istri).
  - `wallet_id`: Source account (e.g., "BCA Suami").
  - `to_wallet_id`: Destination account (nullable, used only for transfers, e.g., "BCA Suami" -> "Dompet Tunai Istri").
  - `category_id`: E.g., "Kebutuhan Rumah Tangga".
  - `amount`: Decimal value.
  - `type`: `income`, `expense`, `transfer`.
  - `description`: Detailed note.
  - `transaction_date`: When it occurred.

### 2. API Endpoints & Logic

- **Auth**: `POST /api/register`, `POST /api/login`.
- **Household Management**: `POST /api/households` (create family), `POST /api/households/invite` (add member by email).
- **Wallets**: `GET /api/wallets` (lists all balances), `POST /api/wallets`.
- **Transactions**: `POST /api/transactions`.
  - **CRITICAL LOGIC**: Wrapped in `DB::transaction()` with pessimistic locking (`lockForUpdate`). Must verify that the user's active household matches the wallet's household. Modifies balances appropriately (e.g., transfer reduces one wallet, increases another).
- **Reports/Dashboard**: `GET /api/reports`.
  - Summaries per wallet, sums grouped by category, breakdown of who spent what (grouped by `user_id`).

## Verification Plan

### Automated Tests
1. **Migration & Seed**: We will run `php artisan migrate:fresh --seed` with mock users and a shared household.
2. **Access Control Checks**: Write Feature tests to verify User A (Household 1) cannot view or spend from Wallet B (Household 2).
3. **Ledger Integrity**: E2E API tests via Postman/cURL ensuring that when "BCA Suami" transfers to "Dompet Istri", the sum of balances remains identical, and both wallets reflect the correct new balances.

### Manual Verification
1. Register a mock Husband and Wife, connect them to the same household.
2. Test detailed logging: Husband inputs his salary into 'BCA Suami'. Wife spends from 'BCA Suami' into category 'Belanja'. 
3. Fetch the `/api/reports` and confirm the UI data is detailed but easily digestible.
