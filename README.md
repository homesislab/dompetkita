# DompetKita

**DompetKita** is a self-hostable **family finance tracker** (a "Money Lover"-style clone) that lets a whole household — husband, wife, and children — collaborate on a single shared ledger. It supports multiple wallets (bank, cash, e-wallet), income / expense / transfer tracking, budgets, savings goals, bill reminders, AI receipt scanning, and Gmail-based transaction sync.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel 11 (PHP 8.2+), SQLite, Sanctum token auth |
| Frontend | Vite + vanilla JS (PWA with offline queue) |
| AI | Google Gemini (receipt OCR & auto-categorization) |
| Deployment | Docker + Nginx |

## Repository structure

```
.
├── dompetkita-api/     # Laravel 11 REST API (backend)
├── dompetkita-web/     # Vite web app (frontend, PWA)
└── docker-compose.yml  # Runs api + api-nginx + web together
```

## Features

- Multi-user **shared household ledger** with roles (admin / member) and email invitations
- Multiple wallets per household (bank, cash, e-wallet) with real-time balances
- **Atomic** income / expense / transfer transactions (`DB::transaction()` + `lockForUpdate`)
- Income & expense categories (defaults + custom per household)
- Monthly summary & dashboard (per wallet, per category, per member)
- Budgets, savings goals (with checklist items), and bill reminders
- **AI receipt scanner** (Google Gemini) with line-item extraction and auto-categorization
- **Gmail email sync** to import transactions from emails
- Balance reconciliation ("Sesuaikan Saldo") that records an audit-trail adjustment

## Quick start

See [`RUNNING_GUIDE.md`](./RUNNING_GUIDE.md) for full step-by-step instructions. In short:

### Backend (Laravel API)

```bash
cd dompetkita-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8003
```

### Frontend (Vite web)

```bash
cd dompetkita-web
npm install
npm run dev   # opens http://localhost:5173
```

In dev, the frontend talks to the API at `http://localhost:8003/api`. Override this by
copying `.env.example` to `.env` and setting `VITE_API_BASE`.

### Docker (all-in-one)

```bash
docker compose up -d
docker compose exec api php artisan migrate --seed
```

- Web → http://localhost:8085
- API (via nginx) → http://localhost:8004
- The web container's nginx proxies `/api` and `/storage` to the API, so the
  browser only ever talks to the web origin.

## Configuration

Set these in `dompetkita-api/.env`:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini key for receipt scanning. **Server-side only** — never exposed to the browser. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth login and Gmail sync. |
| `APP_URL` | Base URL used for OAuth redirects. |

## Testing

```bash
cd dompetkita-api
php artisan test
```

Feature tests cover household isolation (access control) and ledger integrity
(balance conservation on transfers).

## Security notes

- The Gemini API key is read from the backend `GEMINI_API_KEY` env var only. It is
  never sent to or stored in the browser.
- `.env` files are git-ignored; never commit real secrets. Use the `.env.example`
  files as templates.
