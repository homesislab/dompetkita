# Family Finance Tracker API Walkthrough

I have built a robust, production-ready RESTful API for your Family Finance Tracker using Laravel 11. The system follows a **Wallet/Ledger** architecture, ensuring data integrity and consistency.

## Key Features

- **Wallet Management**: Track multiple wallets with real-time balance updates.
- **Transaction Ledger**: Atomic transaction processing for income, expenses, and transfers using `DB::transaction()` and row-level locking (`lockForUpdate`).
- **Standardized API**: Consistent JSON response format across all endpoints.
- **Monthly Summary**: Automated calculation of total balances and expenses grouped by category for the current month.
- **Docker Ready**: Optimized `Dockerfile` and `docker-compose.yml` for local homelab deployment using PHP 8.2 and Nginx.

## Implementation Details

### Models & Database
- [Wallet.php](file:///home/gie/workspace/dompetkita/finance-api/app/Models/Wallet.php): Handles multiple wallets (e.g., 'Dompet Anggy').
- [Category.php](file:///home/gie/workspace/dompetkita/finance-api/app/Models/Category.php): Categorizes financial flows into Income/Expense.
- [Transaction.php](file:///home/gie/workspace/dompetkita/finance-api/app/Models/Transaction.php): The core ledger entry correctly tracking amounts, wallets, and categories.

### API Controllers
- [TransactionController.php](file:///home/gie/workspace/dompetkita/finance-api/app/Http/Controllers/Api/TransactionController.php): Contains the business logic for updating wallet balances atomically.
- [SummaryController.php](file:///home/gie/workspace/dompetkita/finance-api/app/Http/Controllers/Api/SummaryController.php): Provides the data needed for the Flutter mobile app dashboard.

### Deployment
- [Dockerfile](file:///home/gie/workspace/dompetkita/finance-api/Dockerfile) & [docker-compose.yml](file:///home/gie/workspace/dompetkita/finance-api/docker-compose.yml): Configured for an immediate "up and running" experience in your homelab.

## How to Run

1. **Deploy with Docker**:
   ```bash
   cd finance-api
   docker compose up -d
   docker compose exec app php artisan migrate --seed
   ```

2. **Verify Endpoints**:
   - `GET /api/wallets`: List all wallets.
   - `GET /api/summary`: Dashboard summary data.
   - `POST /api/transactions`: Create new income/expense/transfer.

## Sample Request (Postman/cURL)
```bash
curl -X POST http://localhost:8000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "type": "income",
    "amount": 500000,
    "wallet_id": 1,
    "category_id": 7,
    "description": "Bonus",
    "transaction_date": "2026-03-15 08:00:00"
  }'
```
