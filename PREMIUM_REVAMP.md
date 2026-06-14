# DompetKita — Premium Revamp

Dokumen ini adalah sumber kebenaran untuk revamp **desain, workflow, dan fitur premium** DompetKita.
Referensi visual yang bisa diklik ada di [`design/prototype.html`](./design/prototype.html) (buka di browser).

---

## 1. Rekomendasi stack

**Keputusan: tetap di Vite + vanilla JS (PWA) untuk frontend, poles dengan design system baru. Tidak migrasi framework.**

Alasan:

| Pertimbangan | Penjelasan |
| --- | --- |
| Risiko | App sudah jalan (~3.300 baris `main.js`). Rewrite ke React/Vue = risiko regresi besar tanpa nilai tambah untuk skala saat ini. |
| Performa | Vanilla + PWA = bundle kecil, cocok untuk pengguna mobile Indonesia (jaringan/HP menengah). |
| Kecepatan kerja | Design system (tokens + komponen CSS) memberi lompatan visual "premium" tanpa menyentuh logika. |
| Masa depan | Jika nanti butuh, struktur `renderPage()` per halaman mudah dipindah ke komponen framework satu per satu. |

Backend tetap **Laravel 11 + SQLite** (atau MySQL/Postgres saat produksi). Fitur premium ditambah sebagai modul baru, mengikuti pola controller/service yang sudah ada.

---

## 2. Design System 5.0

### Token inti
- **Brand:** Indigo `#6366f1` → `#4f46e5`, aksen Violet `#8b5cf6`, Teal `#14b8a6`.
- **Semantik:** positif `#10b981`, negatif `#f43f5e`, peringatan `#f59e0b`.
- **Netral:** skala gelap (midnight `#0a0e17`) & terang (`#f4f6fb`) — dark mode default.
- **Radius:** 8 / 14 / 20 / 28 / full. **Bayangan:** 3 tingkat + glow brand.
- **Tipografi:** Outfit (300–800). **Ikon:** Phosphor.
- **Motion:** `cubic-bezier(.16,1,.3,1)`, 0.28s standar.

### Prinsip
1. **Flat + soft depth** — kartu dengan border tipis & bayangan halus, bukan skeuomorfik.
2. **Glassmorphism terukur** — hanya di topbar/overlay, tidak berlebihan.
3. **Hirarki angka** — nominal uang selalu `tabular-nums`, ukuran besar untuk saldo/net worth.
4. **Warna = makna** — hijau masuk, merah keluar, indigo netral/transfer.
5. **Aksesibilitas** — kontras AA, target sentuh ≥ 44px, dukung light & dark.

---

## 3. Workflow / Information Architecture baru

```
Dashboard  → ringkasan net worth, arus kas, kategori, transaksi terbaru
Dompet     → kartu multi-currency, total dalam mata uang dasar
Transaksi  → filter cepat (chip) + daftar dikelompokkan per tanggal
Anggaran   → envelope budgeting dengan meter & peringatan over-budget
Berulang   → langganan & tagihan, jatuh tempo, auto-posting
Laporan    → periode + KPI + ekspor PDF/Excel + analitik per anggota
```

- **Desktop:** sidebar kiri tetap + topbar (search, mata uang, tema, tambah cepat).
- **Mobile:** bottom-nav 5 ikon + FAB "Tambah" mengambang.
- **Aksi utama** (Tambah Transaksi) selalu ≤ 1 tap dari mana saja.
- **Workflow tambah transaksi** disederhanakan: pilih tipe → nominal → dompet → kategori → (opsional) struk/AI → simpan.

---

## 4. Fitur premium — spesifikasi & rencana backend

Semua tabel baru mengikuti konvensi Laravel (migration + model + controller, scoped per `household`).

### 4.1 Multi-currency & kurs
- `households.base_currency` (string, default `IDR`).
- `wallets.currency` (string, default `IDR`).
- Tabel `exchange_rates(base, quote, rate, fetched_at)` — cache kurs harian.
- Service `CurrencyConverter` mengonversi saldo dompet ke mata uang dasar untuk total & laporan.
- API: `GET /api/households/{id}/net-worth` mengembalikan total dalam base currency.

### 4.2 Transaksi berulang & langganan
- Tabel `recurring_transactions(household_id, type, amount, wallet_id, category_id, cadence, next_run_at, day_of_month, active)`.
- Command terjadwal `recurring:post` (Laravel scheduler) membuat transaksi saat jatuh tempo + notifikasi.
- Deteksi langganan: tandai transaksi berpola tetap sebagai langganan.
- API: CRUD `/api/households/{id}/recurring`, plus `POST /recurring/{id}/run-now`.

### 4.3 Budgeting / envelope canggih
- Tabel `budget_envelopes(household_id, category_id, period, amount, rollover)`.
- Rollover sisa amplop ke periode berikut (opsional per amplop).
- Status: aman / mendekati (≥80%) / over (≥100%) — dipakai untuk warna meter & peringatan.
- API: `/api/households/{id}/envelopes` + `GET /envelopes/status?period=YYYY-MM`.

### 4.4 Analitik & insight cerdas
- Endpoint agregasi: tren 6 bulan, kategori teratas, "siapa belanja apa" per anggota, rasio tabungan.
- Insight otomatis (rule-based dulu): "Transportasi 12% di atas rata-rata", "Surplus 3 bulan beruntun".
- API: `GET /api/households/{id}/analytics?period=...`.

### 4.5 Ekspor laporan (PDF/Excel)
- PDF: ringkasan periode (KPI, grafik, daftar) — gunakan `barryvdh/laravel-dompdf`.
- Excel: semua transaksi + pivot per kategori — gunakan `maatwebsite/excel`.
- API: `GET /api/households/{id}/reports/export?format=pdf|xlsx&period=...` (stream download).

---

## 5. Roadmap implementasi (saran urutan)

1. **Design system** — terapkan token & komponen baru ke `style.css`, sinkronkan kelas di `main.js`. *(visual paling terasa, risiko rendah)*
2. **Multi-currency** — migration + converter + tampilan total. *(fondasi laporan akurat)*
3. **Envelope budgeting** — perluas modul anggaran yang sudah ada.
4. **Recurring & langganan** — scheduler + notifikasi.
5. **Analitik** — endpoint agregasi + kartu insight.
6. **Ekspor PDF/Excel** — paket pelaporan.

> Catatan: prototype `design/prototype.html` sudah memvisualkan target akhir untuk keenam area di atas, jadi bisa dipakai sebagai acuan saat mengoding tiap langkah.
