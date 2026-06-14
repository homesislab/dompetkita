# Running Guide: DompetKita

This project has two parts: the **Backend** (Laravel API) and the **Frontend** (Vite web app).

> **Port convention (dev):** the backend runs on **8003** and the frontend (Vite) on **5173**.
> The frontend is configured to call the API at `http://localhost:8003/api`, so the backend
> must be running on 8003 for the app to work. (For Docker, see the bottom of this guide.)

## 1. Backend (Laravel API)

The backend lives in the `dompetkita-api` directory. It uses Laravel 11 and SQLite.

### Prerequisites
- PHP 8.2+
- Composer
- SQLite

### Steps to run
1. Go to the API directory:
   ```bash
   cd dompetkita-api
   ```
2. Install dependencies:
   ```bash
   composer install
   ```
3. Set up the environment file:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. (Optional) Configure integrations in `.env`:
   - `GEMINI_API_KEY=` — required for the AI receipt scanner.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — required for Google login and Gmail sync.
5. Run migrations and seed data (required on first run):
   ```bash
   php artisan migrate --seed
   ```
6. **Start the server on port 8003** (required by the frontend):
   ```bash
   php artisan serve --port=8003
   ```

---

## 2. Frontend (Vite web)

The frontend lives in the `dompetkita-web` directory.

### Prerequisites
- Node.js
- npm

### Steps to run
1. Go to the web directory:
   ```bash
   cd dompetkita-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. (Optional) Point the app at a custom API URL by copying `.env.example` to `.env`
   and setting `VITE_API_BASE`. If you leave it empty, the defaults are used:
   - dev (Vite, :5173) → `http://localhost:8003/api`
   - production / Docker → `/api` (same origin, proxied by nginx)
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open the URL Vite prints (usually `http://localhost:5173`).

### Note on the API connection
In dev the frontend connects to `http://localhost:8003/api`. Make sure the backend
is running on port **8003** (step 6 above).

---

## 3. Docker (all-in-one)

```bash
docker compose up -d
docker compose exec api php artisan migrate --seed
```

- Web → http://localhost:8085
- API (via nginx) → http://localhost:8004

The web container's nginx proxies `/api` and `/storage` to the backend, so in Docker
you do **not** need to expose the backend port to the browser.
