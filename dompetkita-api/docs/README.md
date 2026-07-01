# DompetKita — Dokumentasi

Dokumentasi lengkap untuk backend DompetKita (Laravel 11).

## Isi
| Dokumen | Deskripsi |
|---|---|
| [`API.md`](./API.md) | Referensi REST API (semua endpoint + contoh cURL) |
| [`openapi.yaml`](./openapi.yaml) | Spesifikasi OpenAPI 3.0 (Swagger) |
| [`swagger.html`](./swagger.html) | Swagger UI siap pakai (buka di browser) |

## Cara membuka Swagger UI

**Opsi A — langsung dari file** (paling cepat):
```bash
cd dompetkita-api/docs
python3 -m http.server 8080
# buka http://localhost:8080/swagger.html
```
> `swagger.html` memuat aset Swagger UI dari CDN dan membaca `./openapi.yaml`.

**Opsi B — via Laravel** (agar tersaji di domain API):
```bash
cp -r docs public/docs
# buka http://localhost:8003/docs/swagger.html
```

**Opsi C — editor online:** tempel isi `openapi.yaml` ke https://editor.swagger.io

## Arsitektur singkat

```
WhatsApp Bot ─▶ n8n ─▶ /api/n8n/parse-text (AI) ─▶ /api/n8n/.../transactions ─▶ DompetKita
                                                   ▲
Gemini / OpenAI ◀── AiClient (provider switch) ────┘

Scheduler:
  bills:generate  (01:00)  auto-post tagihan berulang
  budgets:remind  (20:00)  kirim alert anggaran ke N8N_WEBHOOK_URL
```

## Environment penting
```env
# AI
AI_PROVIDER=gemini            # atau openai
GEMINI_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# n8n
N8N_API_TOKEN=                # token yang dipakai n8n (X-Api-Key)
N8N_WEBHOOK_URL=              # opsional, tujuan event keluar
```

## Setup
```bash
cd dompetkita-api
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate            # otomatis seed paket Free/Pro/Family
php artisan serve --port=8003

# scheduler (produksi): tambahkan cron
# * * * * * cd /path/to/dompetkita-api && php artisan schedule:run >> /dev/null 2>&1
```
