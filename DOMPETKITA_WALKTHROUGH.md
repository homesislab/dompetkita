# DompetKita — Family Finance Tracker API Walkthrough

DompetKita is a RESTful family finance tracker built with **Laravel 11**. The system follows a
**Wallet / Ledger** architecture to ensure data integrity and consistency across a shared
household ledger.

## Key features

- **Wallet management**: track multiple wallets per household with real-time balance updates.
- **Transaction ledger**: atomic processing for income, expenses, and transfers using
  `DB::transaction()` and row-level locking (`lockForUpdate`).
- **Household isolation**: every request is scoped to a household and verified against
  membership, so users cannot read or modify another household's data.
- **Standardized API**: consistent JSON response format (`success`, `message`, `data`).
- **Monthly summary**: total balances and expenses grouped by category for the current month.
- **AI receipt scanner**: Google Gemini extracts store, date, total, line items, and a
  predicted category. The Gemini key is read **server-side** from `GEMINI_API_KEY`.
- **Docker ready**: `Dockerfile` + `docker-compose.yml` for local / homelab deployment.

## Implementation details

### Models & database (`dompetkita-api/app/Models`)
- `Wallet.php` — wallets belonging to a household (bank, cash, e-wallet).
- `Category.php` — classifies financial flows into income / expense.
- `Transaction.php` — the core ledger entry tracking amounts, wallets, and categories.
- `Household.php` / `HouseholdUser.php` — the shared ledger and its members.

### API controllers (`dompetkita-api/app/Http/Controllers/Api`)
- `TransactionController.php` — atomic balance updates for income / expense / transfer,
  plus edit, delete, and balance reconciliation.
- `WalletController.php` — wallet CRUD, all scoped to the household.
- `SummaryController.php` — dashboard summary data.
- `ReceiptController.php` — AI receipt OCR via Gemini.

### Deployment
- `dompetkita-api/Dockerfile` & root `docker-compose.yml` — configured for an immediate
  "up and running" experience.

## How to run (Docker)

```bash
docker compose up -d
docker compose exec api php artisan migrate --seed
```

- Web → http://localhost:8085
- API (via nginx) → http://localhost:8004

For local (non-Docker) development, see `RUNNING_GUIDE.md` — the backend runs on port **8003**.

## Verify endpoints

All resource endpoints are scoped under a household and require a Sanctum token:

- `GET  /api/households/{householdId}/wallets` — list wallets.
- `GET  /api/households/{householdId}/summary` — dashboard summary.
- `POST /api/households/{householdId}/transactions` — create income / expense / transfer.

### Sample request (cURL)

```bash
curl -X POST http://localhost:8003/api/households/1/transactions \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <YOUR_SANCTUM_TOKEN>" \
  -d '{
    "type": "income",
    "amount": 500000,
    "wallet_id": 1,
    "category_id": 7,
    "description": "Bonus",
    "transaction_date": "2026-03-15 08:00:00"
  }'
```
