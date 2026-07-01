# DompetKita — API Reference

Base URL (dev): `http://localhost:8003/api` · Base URL (prod): `https://your-domain.com/api`

> Spesifikasi mesin: [`openapi.yaml`](./openapi.yaml) · Swagger UI: buka [`swagger.html`](./swagger.html)

---

## 1. Autentikasi

### 1.1 User (aplikasi) — Laravel Sanctum
Dapatkan token dari `POST /login` atau `POST /register`, lalu kirim di setiap request:

```
Authorization: Bearer <token>
Accept: application/json
```

```bash
curl -X POST http://localhost:8003/api/login \
  -H 'Accept: application/json' \
  -d 'email=you@example.com&password=secret'
```

### 1.2 n8n / mesin — token statis
Endpoint `/n8n/*` memakai token statis (env `N8N_API_TOKEN`):

```
X-Api-Key: <N8N_API_TOKEN>
```
(atau `Authorization: Bearer <N8N_API_TOKEN>`)

### 1.3 Header AI (opsional)
Untuk endpoint AI (`/receipts/scan`, `/email-sync/fetch`, `/n8n/parse-text`):

| Header | Nilai | Fungsi |
|---|---|---|
| `X-AI-Provider` | `gemini` \| `openai` | Override provider default (`AI_PROVIDER`) |
| `X-OpenAI-Key` | `sk-...` | Override OpenAI key per-request |
| `X-Gemini-Key` | `AIza...` | Override Gemini key per-request |

---

## 2. Endpoint inti

### Auth
| Method | Path | Ket |
|---|---|---|
| POST | `/register` | Registrasi |
| POST | `/login` | Login, dapat token |
| POST | `/logout` | Revoke token |
| GET/PUT | `/user` | Profil |

### Households
| Method | Path |
|---|---|
| GET/POST | `/households` |
| GET | `/households/{id}/members` |
| POST | `/households/{id}/invite` |
| POST | `/households/{id}/accept-invite` · `/reject-invite` |

### Wallets · Categories · Transactions (scope `households/{householdId}`)
| Method | Path |
|---|---|
| GET/POST | `/wallets` · PUT/DELETE `/wallets/{wallet}` |
| GET/POST | `/categories` · PUT/DELETE `/categories/{category}` |
| GET/POST | `/transactions` · PUT/DELETE `/transactions/{transaction}` |
| POST | `/sync-balance` |
| GET | `/summary` |

#### Transaksi dengan split funding (multi-sumber)
```bash
curl -X POST http://localhost:8003/api/households/1/transactions \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{
    "type": "expense", "amount": 500000, "wallet_id": 2,
    "description": "Belanja bulanan",
    "allocations": [
      { "wallet_id": 2, "amount": 300000 },
      { "wallet_id": 2, "pocket_id": 5, "amount": 200000 }
    ]
  }'
```
Total `allocations[].amount` **harus** sama dengan `amount`.

---

## 3. Fitur baru

### 3.1 Pockets (Kantong — Dana Anak, tabungan)
| Method | Path |
|---|---|
| GET/POST | `/households/{id}/pockets` |
| GET | `/households/{id}/pockets/summary` |
| PUT/DELETE | `/households/{id}/pockets/{pocketId}` |
| POST | `/households/{id}/pockets/{pocketId}/allocate` |

### 3.2 Planner / Simulasi
`GET /households/{id}/planner` — proyeksi income → wajib → sisa + what-if.

### 3.3 Bill Reminders (recurring + auto-post)
| Method | Path |
|---|---|
| GET/POST | `/households/{id}/bill-reminders` |
| PUT/DELETE | `/households/{id}/bill-reminders/{billReminder}` |
| POST | `/households/{id}/bill-reminders/{billReminder}/pay` |

Field: `repeat_type` = `none\|weekly\|monthly\|yearly\|custom`, `repeat_interval`, `auto_post`, `wallet_id`, `pocket_id`.

### 3.4 Anggaran harian + reminder
- `GET /households/{id}/budget-status` — status harian per kategori (`ok\|warning\|over`).
- Command terjadwal: `php artisan budgets:remind` (harian 20:00) → kirim alert ke webhook n8n.

### 3.5 Dompet terhubung (shared wallets)
| Method | Path | Ket |
|---|---|---|
| GET | `/households/{id}/wallet-links` | Dompet yang saya bagikan |
| POST | `/households/{id}/wallets/{walletId}/share` | Bagikan (`permission`: `view\|spend`) |
| DELETE | `/households/{id}/wallet-links/{linkId}` | Hentikan berbagi |
| GET | `/households/{id}/shared-with-me` | Dompet yang dibagikan ke saya |

```bash
curl -X POST http://localhost:8003/api/households/1/wallets/2/share \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{ "shared_household_id": 9, "permission": "view" }'
```

### 3.6 SaaS — Plans & Subscription
| Method | Path |
|---|---|
| GET | `/plans` |
| GET | `/subscription` |
| POST | `/subscription/subscribe` |

```bash
curl -X POST http://localhost:8003/api/subscription/subscribe \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{ "plan_slug": "pro", "provider": "midtrans", "external_ref": "INV-123" }'
```
Paket default (seeded): **Free**, **Pro** (Rp49.000/bln), **Family** (Rp99.000/bln). Aktivasi langsung; sambungkan gateway (Midtrans/Stripe) atau n8n untuk memproses pembayaran nyata.

---

## 4. AI (Gemini / OpenAI)

- `POST /receipts/scan` (multipart `image`, `household_id`) — OCR struk → JSON item.
- `POST /email-sync/fetch` — tarik & parse email bank/e-wallet.

Provider dipilih via `AI_PROVIDER` (default `gemini`) atau header `X-AI-Provider`.

---

## 5. n8n Integration (WhatsApp bot → n8n → app)

Semua endpoint memakai `X-Api-Key: <N8N_API_TOKEN>`.

| Method | Path | Ket |
|---|---|---|
| GET | `/n8n/ping` | Health check |
| POST | `/n8n/parse-text` | Teks bebas → JSON transaksi (AI) |
| GET | `/n8n/households/{id}/wallets` | Daftar dompet |
| GET | `/n8n/households/{id}/summary` | Ringkasan bulan berjalan |
| POST | `/n8n/households/{id}/transactions` | Catat transaksi |

### Alur wabot
1. **WhatsApp bot** meneruskan pesan chat ke workflow **n8n**.
2. n8n memanggil `POST /n8n/parse-text` → dapat `{ type, amount, merchant, ... }`.
3. n8n memanggil `POST /n8n/households/{id}/transactions` untuk mencatat.

```bash
# Step 1: parse pesan chat
curl -X POST http://localhost:8003/api/n8n/parse-text \
  -H 'X-Api-Key: <N8N_API_TOKEN>' -H 'Content-Type: application/json' \
  -H 'X-AI-Provider: openai' \
  -d '{ "text": "Bayar listrik 350rb dari BCA" }'

# Step 2: catat transaksi
curl -X POST http://localhost:8003/api/n8n/households/1/transactions \
  -H 'X-Api-Key: <N8N_API_TOKEN>' -H 'Content-Type: application/json' \
  -d '{ "type": "expense", "amount": 350000, "wallet_id": 2, "description": "Listrik" }'
```

### Webhook keluar (opsional)
Jika `N8N_WEBHOOK_URL` diisi, DompetKita mengirim event ke n8n, mis. reminder anggaran harian:
```json
{ "event": "budget.daily_reminder", "data": { "household_id": 1, "date": "2026-07-01", "alerts": [ ... ] }, "sent_at": "..." }
```

---

## 6. Kode status umum
| Kode | Arti |
|---|---|
| 200/201 | Sukses |
| 401 | Token tidak valid (Sanctum / n8n) |
| 403 | Bukan anggota household |
| 422 | Validasi gagal |
| 500/502/503 | Error server / AI / token n8n belum diset |
