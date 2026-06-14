# DompetKita (Money Lover Clone) Implementation — Task List

## Done ✅
- [x] **Project Setup & Environment**: Laravel 11, SQLite, Docker + Nginx orchestration.
- [x] **Core Database Schema**: Households, Wallets, Categories, Transactions (Multi-User Ledger).
- [x] **Logic & API**:
    - [x] Auth (Register, Login, Google OAuth).
    - [x] Household Management (Family creation & Invitations).
    - [x] Atomic Transaction Controller (Locks & Balance updates).
    - [x] Reporting & Dashboard (Monthly summaries, user-based breakdowns).
    - [x] Bill Reminders, Savings Goals, and Budget Tracking.
- [x] **Receipt Scanner Integration**: OCR capability using Google Gemini.
- [x] 1. Lanjutkan task nya (Progress development UI/UX & AI Scanner backend).
- [x] 2. Button "See Details" di family member belum jalan (Fixed event listener `view-member-btn` in `main.js`).
- [x] 3. Konfigurasi API Key AI hardcode menjadi: `AIzaSyAtVSJkmyz7iJYlZdeFeCB8bVcqYHoLOPk`.
- [x] 4. Buatkan list task yang sudah dan belum dikerjakan (Updated this file).
- [x] 5. Pada mode malam, icon kurang terlihat (Updated `index.css` topbar icons).
- [x] 6. Tombol FAB (+) harus membuka modal "Tambah Transaksi" dan "Scan Struk" ada di dalamnya (Refactored `openTransactionModal`).
- [x] 7. Di night mode, dropdown "Select Category" listnya tidak terlihat (Added `.category-select option` color styling in `index.css`).
- [x] 8. Scan struk dari menu "More" dihapus (Removed from `pageMore` and CSS grid updated).
- [x] 9. Button "Sesuaikan Saldo" belum jalan (Fixed `syncBalance()` string interpolation and DOM insertion bugs).
- [x] 10. Edit transaksi belum jalan/tidak mengupdate data (Fixed `editTx` null reference exceptions on event listeners and HTML input placeholders, fixed conditional rendering issues with scanner UI during Edit mode).

## Remaining 🚀
- [x] **Scan Struk Menu**: Fix visibility or accessibility of the scan menu (user reports it is "missing"). -> *Diselesaikan via desain: Menu scanner sudah diintegrasikan langsung ke dalam modal "Tambah Transaksi" (+).*
- [x] **UI Polish**: Improve "More" page layout (currently horizontal, needs grid). -> *Done: Changed to 2-column square grid with styling.*
- [x] **Transaction Categorization**: Auto-assign categories for scanned receipts. -> *Done: Updated ReceiptController AI prompt to predict category via DB categories context.*
- [x] **Frontend Robustness**: Add input validation for transaction forms. -> *Done: Explicit UI error toasts preventing silent submission failures, including double-tap guards.*
- [x] **Offline Mode/Service Workers**: Enhance PWA capabilities for flaky network conditions. -> *Done: Added full LocalStorage-based queue for POST/PUT mutations that syncs immediately when `navigator.onLine` fires true.*

## Verification
- [x] Browser testing for all major pages.
- [x] Backend API integrity with multi-user isolation.
