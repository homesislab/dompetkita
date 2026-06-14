# Running Guide: DompetKita

This project consists of two main parts: the Backend (API) and the Frontend (Web).

## 1. Backend (Laravel API)

The backend is located in the `dompetkita-api` directory. It uses Laravel 11 and SQLite.

### Prerequisites
- PHP 8.2+
- Composer
- SQLite

### Steps to Run
1. Go to the API directory:
   ```bash
   cd dompetkita-api
   ```
2. Install dependencies (if not already done):
   ```bash
   composer install
   ```
3. Setup environment file (if not already done):
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. Run migrations and seed data (required for first run):
   ```bash
   php artisan migrate --seed
   ```
5. **Start the server on port 8001** (required by the frontend):
   ```bash
   php artisan serve --port=8001
   ```

---

## 2. Frontend (Vite Web)

The frontend is located in the `dompetkita-web` directory. It is a simple Vite project.

### Prerequisites
- Node.js
- npm

### Steps to Run
1. Go to the Web directory:
   ```bash
   cd dompetkita-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the URL provided by Vite (usually `http://localhost:5173`) in your browser.

### Note on API Connection
The frontend is configured to connect to the API at `http://localhost:8001/api`. Ensure the backend is running on port 8001 for the application to function correctly.
