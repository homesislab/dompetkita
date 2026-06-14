import './style.css';

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = window.location.origin.includes(':5173') ? 'http://localhost:8003/api' : '/api';
const GEMINI_API_KEY = '***REMOVED***';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  householdId: localStorage.getItem('householdId') || null,
  household: null,
  summary: null,
  categories: [],
  transactions: [],
  wallets: [],
  members: [],
  goals: [],
  budgets: [],
  billReminders: [],
  receiptGroups: [],
  myRole: 'member',
  activePage: 'dashboard',
  theme: localStorage.getItem('theme') || 'dark',
};

// ─── API ──────────────────────────────────────────────────────────────────────
async function api(endpoint, method = 'GET', body = null) {
  if (!navigator.onLine && method !== 'GET') {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    queue.push({ endpoint, method, body, timestamp: Date.now() });
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    
    // Check if toast function is initialized, otherwise alert or ignore
    if (typeof toast === 'function') toast('Anda sedang offline. Aksi disimpan sementara.', 'warning');
    return { success: true, message: 'Saved offline', offline: true };
  }

  const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method, headers, body: body ? JSON.stringify(body) : null,
    });
    
    if (res.status === 204) return { success: true };
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  } catch (err) {
    if (!navigator.onLine && method === 'GET') {
      if (typeof toast === 'function') toast('Mode offline (Menampilkan data tersimpan).', 'warning');
      throw new Error('Anda sedang offline.');
    }
    throw err;
  }
}

async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  if (queue.length === 0) return;
  
  if (typeof toast === 'function') toast('Koneksi pulih! Menyinkronkan data tertunda...', 'warning');
  let successCount = 0;
  
  for (const item of queue) {
    try {
      // Direct fetch bypasses the interceptor
      const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
      if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
      const res = await fetch(`${API_BASE}${item.endpoint}`, {
        method: item.method, headers, body: item.body ? JSON.stringify(item.body) : null,
      });
      if (res.ok) successCount++;
    } catch (err) {
      console.error('Failed to sync offline item', item, err);
    }
  }
  
  localStorage.removeItem('offline_queue');
  if (successCount > 0 && typeof toast === 'function') {
    toast(`${successCount} aksi berhasil disinkronkan ke server.`, 'success');
    if (state.householdId && typeof fetchData === 'function') fetchData(state.householdId);
  }
}
window.addEventListener('online', syncOfflineQueue);

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('id-ID').format(Number(n) || 0);
const fdate = d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const initials = name => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const walletMeta = type => ({
  bank: ['#0ea5e9', '<i class="ph-fill ph-bank"></i>'],
  cash: ['#10b981', '<i class="ph-fill ph-money"></i>'],
  'e-wallet': ['#f59e0b', '<i class="ph-fill ph-device-mobile"></i>'],
}[type] || ['#818cf8', '<i class="ph-fill ph-wallet"></i>']);

const typeEmoji = t => ({ income: '<i class="ph-fill ph-trend-up"></i>', expense: '<i class="ph-fill ph-trend-down"></i>', transfer: '<i class="ph ph-arrows-left-right"></i>' })[t] || '<i class="ph-fill ph-money"></i>';

function toast(msg, type = 'success') {
  const box = document.getElementById('toast-container');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '<i class="ph ph-check"></i>' : '<i class="ph ph-x"></i>'}</span><span class="toast-msg">${msg}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 300); }, 3000);
}

function renderIcon(iconStr, fallback = '<i class="ph-fill ph-tag"></i>') {
  if (!iconStr) return fallback;
  const s = String(iconStr).trim();
  if (s.startsWith('<')) return s; 
  if (s.includes('ph-') && !s.includes('ph ')) {
    return `<i class="ph-fill ${s}"></i>`;
  } else if (s.includes('ph ') || s.includes('ph-')) {
    return `<i class="${s}"></i>`;
  }
  return s; 
}

function logout() { localStorage.clear(); location.reload(); }

// ─── Session ──────────────────────────────────────────────────────────────────
function saveSession(token, user) {
  state.token = token; state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = html;
  const overlay = root.querySelector('.modal-overlay');
  requestAnimationFrame(() => overlay.classList.add('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('.modal-close')?.addEventListener('click', closeModal);
  return overlay;
}
function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => { document.getElementById('modal-root').innerHTML = ''; }, 300);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
function renderAuth() {
  document.getElementById('app').innerHTML = `
    <div class="auth-wrap">
      <!-- LOGIN VIEW -->
      <div class="auth-card" id="login-view">
        <div class="auth-logo">
          <div class="logo-icon" style="background:var(--primary);color:#fff;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.25rem"><i class="ph-fill ph-wallet"></i></div>
          <div>
            <div class="logo-name" style="font-size:1.25rem;font-weight:800;letter-spacing:-0.03em">DompetKita</div>
            <div class="logo-tag" style="font-size:0.75rem;color:var(--text-3);font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Family Finance</div>
          </div>
        </div>
        <h1 class="auth-title" style="font-size:1.75rem;font-weight:800;letter-spacing:-0.04em;margin-bottom:0.5rem">Welcome back</h1>
        <p class="auth-subtitle" style="color:var(--text-2);margin-bottom:2rem;font-size:0.95rem">Sign in to your family dashboard</p>
        
        <form id="login-form">
          <div class="form-field">
            <label>Email Address</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-envelope-simple"></i></span>
              <input id="email" type="email" class="form-input" placeholder="yourname@email.com" required>
            </div>
          </div>
          <div class="form-field">
            <label>Password</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-lock-key"></i></span>
              <input id="password" type="password" class="form-input" placeholder="••••••••" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:1rem">Sign In</button>
        </form>
        <div id="auth-err"></div>

        <div style="margin: 1.5rem 0; text-align: center; color: var(--text-3); font-size: 0.85rem; font-weight: 600; display:flex; align-items:center; gap:0.5rem">
          <hr style="flex:1; border:none; border-top:1px solid var(--border)">
          ATAU
          <hr style="flex:1; border:none; border-top:1px solid var(--border)">
        </div>
        <button type="button" onclick="window.location.href='${API_BASE}/auth/google/redirect'" class="btn btn-ghost btn-full" style="background:#fff;color:#333;border:1px solid #ddd;font-weight:600;display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-bottom:1rem">
          <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google"> Lanjutkan dengan Google
        </button>
        
        <p style="text-align:center; font-size:0.85rem; color:var(--text-3); margin-top:1.5rem">
          Belum punya akun? <a href="#" onclick="event.preventDefault(); document.getElementById('login-view').style.display='none'; document.getElementById('register-view').style.display='block'" style="color:var(--primary);font-weight:700">Daftar manual di sini</a>
        </p>
      </div>

      <!-- REGISTER VIEW -->
      <div class="auth-card" id="register-view" style="display:none">
        <h1 class="auth-title" style="font-size:1.75rem;font-weight:800;letter-spacing:-0.04em;margin-bottom:0.5rem">Buat Akun</h1>
        <p class="auth-subtitle" style="color:var(--text-2);margin-bottom:2rem;font-size:0.95rem">Mulai catat keuangan keluargamu</p>
        <form id="register-form">
          <div class="form-field">
            <label>Nama Panggilan</label>
            <div class="input-wrap"><span class="input-icon"><i class="ph ph-user"></i></span><input id="reg-name" type="text" class="form-input" placeholder="Misal: Budi" required></div>
          </div>
          <div class="form-field">
            <label>Email Address</label>
            <div class="input-wrap"><span class="input-icon"><i class="ph ph-envelope-simple"></i></span><input id="reg-email" type="email" class="form-input" placeholder="yourname@email.com" required></div>
          </div>
          <div class="form-field">
            <label>Password</label>
            <div class="input-wrap"><span class="input-icon"><i class="ph ph-lock-key"></i></span><input id="reg-password" type="password" class="form-input" placeholder="Minimal 8 karakter" required></div>
          </div>
          <div class="form-field">
            <label>Konfirmasi Password</label>
            <div class="input-wrap"><span class="input-icon"><i class="ph ph-lock-key"></i></span><input id="reg-password-conf" type="password" class="form-input" placeholder="Ulangi password" required></div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:1rem;background:linear-gradient(135deg, var(--emerald), #059669)">Sign Up</button>
        </form>
        <div id="reg-err"></div>
        <p style="text-align:center; font-size:0.85rem; color:var(--text-3); margin-top:1.5rem">
          Sudah punya akun? <a href="#" onclick="event.preventDefault(); document.getElementById('register-view').style.display='none'; document.getElementById('login-view').style.display='block'" style="color:var(--primary);font-weight:700">Opsi Login</a>
        </p>
      </div>
    </div>
    <div class="toast-container" id="toast-container"></div>
  `;
  document.getElementById('login-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Signing in…'; btn.disabled = true;
    try {
      const r = await api('/login', 'POST', {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      });
      saveSession(r.data.access_token, r.data.user);
      renderApp();
    } catch (err) {
      document.getElementById('auth-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = 'Sign In'; btn.disabled = false;
    }
  };

  document.getElementById('register-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const pass = document.getElementById('reg-password').value;
    const conf = document.getElementById('reg-password-conf').value;
    
    if (pass !== conf) {
      document.getElementById('reg-err').innerHTML = `<div class="error-msg">Password konfirmasi tidak cocok</div>`;
      return;
    }

    btn.textContent = 'Mendaftar…'; btn.disabled = true;
    try {
      const r = await api('/register', 'POST', {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: pass,
        password_confirmation: conf
      });
      saveSession(r.data.access_token, r.data.user);
      renderApp();
    } catch (err) {
      document.getElementById('reg-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = 'Sign Up'; btn.disabled = false;
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
async function renderApp() {
  document.getElementById('app').innerHTML = `<div class="spinner-wrap"><div class="spinner"></div><p style="color:var(--text-2);font-size:.875rem">Loading…</p></div>`;
  try {
    if (!state.householdId) {
      const hd = await api('/households');
      if (hd.data.length) {
        state.householdId = hd.data[0].id;
        state.household = hd.data[0];
        localStorage.setItem('householdId', state.householdId);
      }
    }
    await refreshAll();
  } catch (err) { console.error(err); return logout(); }
  mountShell();
}

async function refreshAll() {
  const hid = state.householdId;
  const [sumR, catR, txR, walR, memR, goalR, budgetsR, billR, rgR] = await Promise.all([
    api(`/households/${hid}/summary`),
    api(`/households/${hid}/categories`),
    api(`/households/${hid}/transactions`),
    api(`/households/${hid}/wallets`),
    api(`/households/${hid}/members`),
    api(`/households/${hid}/goals`),
    api(`/households/${hid}/budgets`),
    api(`/households/${hid}/bill-reminders`),
    api(`/households/${hid}/receipt-groups`),
  ]);
  state.summary = sumR.data;
  state.categories = catR.data;
  state.transactions = txR.data;
  state.wallets = walR.data;
  state.members = memR.data.members || [];
  state.goals = goalR.data;
  state.budgets = budgetsR.data;
  state.billReminders = billR.data;
  state.receiptGroups = rgR.data;
  state.household = memR.data.household || state.household;
  // Detect current user role
  const me = state.members.find(m => m.id === state.user?.id);
  state.myRole = me?.role || 'member';
}

async function refreshGoals() {
  const r = await api(`/households/${state.householdId}/goals`);
  state.goals = r.data;
}

async function refreshReceiptGroups() {
  const r = await api(`/households/${state.householdId}/receipt-groups`);
  state.receiptGroups = r.data;
}

async function refreshMembers() {
  const r = await api(`/households/${state.householdId}/members`);
  state.members = r.data.members || [];
  const me = state.members.find(m => m.id === state.user?.id);
  state.myRole = me?.role || 'member';
}

async function refreshBudgets() {
  const r = await api(`/households/${state.householdId}/budgets`);
  state.budgets = r.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOUNT SHELL
// ─────────────────────────────────────────────────────────────────────────────
function mountShell() {
  document.body.setAttribute('data-theme', state.theme);
  const hName = state.household?.name || 'Keluarga';
  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <nav class="sidebar">
        <button class="nav-item active" data-page="dashboard"><span class="nav-icon"><i class="ph ph-squares-four"></i></span> Dashboard</button>
        <button class="nav-item" data-page="transactions"><span class="nav-icon"><i class="ph ph-receipt"></i></span> Ledger</button>
        
        <div class="nav-spacer"></div>
        
        <button class="nav-item" data-page="wallets"><span class="nav-icon"><i class="ph ph-wallet"></i></span> Wallets</button>
        <button class="nav-item" data-page="more"><span class="nav-icon"><i class="ph ph-dots-three-circle"></i></span> More</button>
      </nav>

      <div class="main-content">
        <header class="topbar">
          <div class="topbar-title" style="display:flex;align-items:center;gap:1.25rem">
            <div class="logo-icon" style="background:linear-gradient(135deg,var(--primary),var(--violet));color:#fff;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;box-shadow:var(--shadow-btn)"><i class="ph-fill ph-wallet"></i></div>
            <div>
              <h2 id="page-title" style="font-size:1.4rem;font-weight:800;letter-spacing:-0.03em">Dashboard</h2>
              <p id="page-sub" style="color:var(--text-3);font-size:0.85rem;font-weight:500">Welcome back, <strong>${state.user?.name.split(' ')[0]}</strong></p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:1.5rem">
            <div class="topbar-actions" id="topbar-actions"></div>
            <div class="topbar-controls" style="display:flex;gap:0.5rem;border-left:1px solid var(--border);padding-left:1.5rem">
               <button class="btn-icon theme-toggle-btn" id="theme-toggle" title="Toggle Theme"><i class="ph ${state.theme === 'light' ? 'ph-moon' : 'ph-sun'}"></i></button>
               <button class="btn-icon profile-btn" onclick="openProfileModal()" title="Profile"><i class="ph ph-user"></i></button>
               <button class="btn-icon logout-btn" id="logout-btn" title="Logout"><i class="ph ph-sign-out"></i></button>
            </div>
          </div>
        </header>
        <div class="page-body" id="page-body"></div>
      </div>
      
      <button class="fab-new-tx" id="fab-new-tx" title="New Transaction">
        <i class="ph ph-plus"></i>
      </button>
    </div>
    <div id="modal-root"></div>
    <div class="toast-container" id="toast-container"></div>
  `;

  document.getElementById('fab-new-tx').addEventListener('click', () => openTransactionModal());

  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activePage = btn.dataset.page;
      renderPage(btn.dataset.page);
    });
  });

  document.getElementById('logout-btn').addEventListener('click', logout);
  
  document.getElementById('theme-toggle').onclick = () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.getElementById('theme-toggle').innerHTML = `<i class="ph ${newTheme === 'light' ? 'ph-moon' : 'ph-sun'}"></i>`;
  };

  renderPage('dashboard');
}

function setTheme(t) {
  state.theme = t;
  localStorage.setItem('theme', t);
  document.body.setAttribute('data-theme', t);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE ROUTER
// ─────────────────────────────────────────────────────────────────────────────
function renderPage(page) {
  const body = document.getElementById('page-body');
  if (!body) return;
  const titles = {
    dashboard: ['Dashboard', `Overview of ${state.household?.name || ''}`],
    wallets: ['Wallets & Accounts', `${state.wallets.length} accounts · Manage & track balances`],
    transactions: ['Transactions', 'Full ledger history'],
    categories: ['Categories', 'Manage income & expense buckets'],
    members: ['Family Members', `${state.members.length} members in ${state.household?.name || 'your household'}`],
    goals: ['Financial Goals', 'Track your family savings goals and progress'],
    budgets: ['Painless Budgeting', 'Set limits for spending categories and stay on track'],
    'bill-reminders': ['Bill Reminders', 'Track upcoming bills and never miss a payment'],
    receipts: ['Receipts & Price History', `${state.receiptGroups.length} receipts · Track item prices over time`],
    'email-sync': ['Sinkronisasi Email', 'Saldo otomatis dari notifikasi bank & e-wallet'],
    more: ['More Features', 'Access additional management and planning tools'],
  };
  const [t, s] = titles[page] || ['Dashboard', ''];
  document.getElementById('page-title').textContent = t;
  document.getElementById('page-sub').innerHTML = s;

  // Page-specific top-bar action
  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = ''; // Keep empty to avoid duplicating page-internal buttons

  switch (page) {
    case 'dashboard': body.innerHTML = pageDashboard(); break;
    case 'wallets': body.innerHTML = pageWallets(); setupWalletListeners(); break;
    case 'transactions': body.innerHTML = pageTxHistory(); setupTxListeners(); break;
    case 'categories': body.innerHTML = pageCategories(); setupCatListeners(); break;
    case 'members': body.innerHTML = pageMembers(); setupMemberListeners(); break;
    case 'goals': body.innerHTML = pageGoals(); setupGoalListeners(); break;
    case 'budgets': body.innerHTML = pageBudgets(); setupBudgetListeners(); break;
    case 'bill-reminders': body.innerHTML = pageBillReminders(); setupBillReminderListeners(); break;
    case 'receipts': body.innerHTML = pageReceipts(); setupReceiptListeners(); break;
    case 'email-sync': pageEmailSync(); break;
    case 'more': body.innerHTML = pageMore(); setupMoreListeners(); break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: MORE (MENU HUB)
// ─────────────────────────────────────────────────────────────────────────────
function pageMore() {
  const menuItems = [
    { id: 'email-sync', name: 'Sinkron Email', icon: 'ph ph-envelope-simple', desc: 'Auto-sync dari notifikasi bank & e-wallet' },
    { id: 'budgets', name: 'Budgets', icon: 'ph ph-chart-pie-slice', desc: 'Set and track spending limits' },
    { id: 'goals', name: 'Savings Goals', icon: 'ph ph-target', desc: 'Plan for big expenses' },
    { id: 'bill-reminders', name: 'Bills', icon: 'ph ph-calendar-blank', desc: 'Upcoming payments' },
    { id: 'receipts', name: 'Receipts', icon: 'ph ph-receipt', desc: `${state.receiptGroups.length} struk · riwayat harga item` },
    { id: 'categories', name: 'Categories', icon: 'ph ph-tag', desc: 'Manage income & expense buckets' },
    { id: 'members', name: 'Family', icon: 'ph ph-users', desc: 'Manage household access' },
  ];

  return `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
      ${menuItems.map(m => `
        <div class="stat-card more-menu-card" data-target="${m.id}" style="cursor:pointer; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:1.5rem 1rem; border-radius:16px;">
          <div class="card-icon" style="margin:0 0 1rem 0; background:var(--primary-subtle); color:var(--primary); width:56px; height:56px; border-radius:18px; font-size:2rem; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.15)"><i class="${m.icon}"></i></div>
          <div style="font-weight:800; font-size:1.05rem; color:var(--text-1); letter-spacing:-0.03em;">${m.name}</div>
          <div style="font-size:0.75rem; color:var(--text-3); font-weight:500; margin-top:4px; line-height:1.4">${m.desc}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function setupMoreListeners() {
  document.querySelectorAll('.more-menu-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      // Find and activate the 'more' nav button to keep logical state
      const moreBtn = document.querySelector('.nav-item[data-page="more"]');
      if (moreBtn) moreBtn.classList.add('active');
      
      const target = card.dataset.target;
      state.activePage = target;
      renderPage(target);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function pageDashboard() {
  const { summary, transactions, wallets } = state;
  const total = summary?.total_balance || 0;
  const income = summary?.total_income || 0;
  const monthlyBudget = summary?.monthly_budget || 0;
  const monthlyExpense = summary?.monthly_expense || 0;
  const budgetProgress = monthlyBudget > 0 ? Math.min(100, Math.round((monthlyExpense / monthlyBudget) * 100)) : 0;

  const recent = transactions.slice(0, 5);
  const bycat = summary?.expenses_by_category || [];
  const byuser = summary?.expenses_by_user || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return `
    <div style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:flex-end">
      <div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-1)">${greeting}, ${state.user?.name.split(' ')[0]}! 👋</h3>
        <p style="color: var(--text-3); font-size: 0.95rem">Here's what's happening with your family finances.</p>
      </div>
      <div style="display:flex; gap:0.5rem">
        <button class="btn btn-primary btn-sm" onclick="window.openSyncBalanceModal()">
          <i class="ph ph-sliders-horizontal" style="margin-right:2px"></i> Sesuaikan Saldo
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="card-icon"><i class="ph-fill ph-wallet"></i></div>
        <div class="card-label">Net Balance</div>
        <div class="card-value">Rp ${fmt(total)}</div>
        <div class="card-sub">${wallets.length} active wallets</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid var(--rose)">
        <div class="card-icon"><i class="ph-fill ph-trend-up"></i></div>
        <div class="card-label">Expense this Month</div>
        <div class="card-value">Rp ${fmt(monthlyExpense)}</div>
        <div class="card-sub">${budgetProgress}% of Rp ${fmt(monthlyBudget)} budget</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${budgetProgress}%;background:${budgetProgress > 90 ? 'var(--rose)' : 'var(--primary)'}"></div></div>
      </div>
      <div class="stat-card" style="border-left: 4px solid var(--emerald)">
        <div class="card-icon"><i class="ph-fill ph-trend-down"></i></div>
        <div class="card-label">Monthly Income</div>
        <div class="card-value">Rp ${fmt(income)}</div>
        <div class="card-sub">Recorded this month</div>
      </div>
    </div>

    <div class="content-grid">
      <div>
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Recent Transactions</span>
            <button class="btn btn-ghost btn-sm" onclick="document.querySelector('[data-page=transactions]').click()">See all</button>
          </div>
          <div class="panel-body" style="padding:0">
            ${recent.length === 0
      ? `<div style="padding:3rem;text-align:center;color:var(--text-3);font-weight:500">No transactions recorded yet</div>`
      : `<div class="tx-list">${recent.map(tx => txRow(tx)).join('')}</div>`}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><span class="panel-title">Spending by Member</span></div>
          <div class="panel-body" style="padding:0">
            ${byuser.length === 0 ? `<p style="padding:3rem;text-align:center;color:var(--text-3);font-weight:500">No member data yet</p>` :
      byuser.map(u => `
              <div class="list-item">
                <div class="avatar" style="width:36px;height:36px;border-radius:10px;background:var(--surface-2);color:var(--text-1);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem">${initials(u.user)}</div>
                <div class="list-main"><div class="list-name">${u.user}</div></div>
                <div class="list-value text-rose">Rp ${fmt(u.total)}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:1.5rem">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Wallets & Accounts</span>
            <button class="btn btn-ghost btn-sm" onclick="document.querySelector('[data-page=wallets]').click()">Manage</button>
          </div>
          <div class="panel-body" style="padding:0">
            ${wallets.slice(0, 4).map(w => `
              <div class="list-item">
                <div class="list-icon" style="background:var(--primary-subtle);color:var(--primary)">${renderIcon(w.icon, '<i class="ph ph-credit-card"></i>')}</div>
                <div class="list-main"><div class="list-name">${w.name}</div><div class="list-sub">${w.type}</div></div>
                <div class="list-value">Rp ${fmt(w.balance)}</div>
              </div>`).join('')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><span class="panel-title">Top Expenses</span></div>
          <div class="panel-body">
            ${bycat.length === 0 ? `<p style="color:var(--text-3);text-align:center">No data</p>` :
      bycat.slice(0, 4).map(c => {
        const pct = c.budget > 0 ? Math.min(100, Math.round((c.total / c.budget) * 100)) : 0;
        return `
                <div style="margin-bottom:1.25rem">
                  <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem">
                    <span style="font-size:0.9rem;font-weight:700">${c.category}</span>
                    <span style="font-size:0.85rem;color:var(--text-2);font-weight:600">Rp ${fmt(c.total)}</span>
                  </div>
                  <div class="progress-bar" style="height:6px"><div class="progress-fill" style="width:${pct || 0}%;background:${pct > 90 ? 'var(--rose)' : 'var(--primary)'}"></div></div>
                </div>`;
      }).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ICON PICKER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ICON_LIST = ['ph-wallet', 'ph-bank', 'ph-money', 'ph-device-mobile', 'ph-house', 'ph-shopping-cart', 'ph-hamburger', 'ph-car', 'ph-lightbulb', 'ph-airplane', 'ph-game-controller', 'ph-gift', 'ph-hospital', 'ph-graduation-cap', 'ph-wrench', 'ph-t-shirt', 'ph-briefcase', 'ph-pizza', 'ph-coffee', 'ph-train', 'ph-bicycle', 'ph-popcorn', 'ph-calendar', 'ph-paw-print', 'ph-tree', 'ph-soccer-ball', 'ph-mask-happy', 'ph-guitar-telecaster'];

function renderIconPicker(currentIcon = 'ph-wallet', targetId = 'selected-icon') {
  return `
    <div class="icon-picker">
      <div id="${targetId}" class="selected-icon-preview"><i class="ph ${currentIcon}"></i></div>
      <div class="icon-grid">
        ${ICON_LIST.map(icon => `
          <div class="icon-option ${icon === currentIcon ? 'selected' : ''}" onclick="selectIcon('${icon}', '${targetId}')"><i class="ph ${icon}"></i></div>
        `).join('')}
      </div>
      <input type="hidden" id="${targetId}-input" value="${currentIcon}">
    </div>
  `;
}

window.switchTab = (id, el) => {
  const cont = el.closest('.segmented-tabs').nextElementSibling;
  el.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  cont.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  document.getElementById(id).classList.add('active');
};

window.selectIcon = (icon, targetId) => {
  document.getElementById(targetId).innerHTML = `<i class="ph ${icon}"></i>`;
  document.getElementById(`${targetId}-input`).value = icon;
  document.querySelectorAll('.icon-option').forEach(opt => {
    opt.classList.toggle('selected', opt.textContent === icon);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: WALLETS (full CRUD)
// ─────────────────────────────────────────────────────────────────────────────
function pageWallets() {
  const { wallets } = state;
  return `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">My Wallets</span>
        <button class="btn btn-primary btn-sm" id="new-wallet-btn"><i class="ph ph-plus" style="margin-right:2px"></i> Add Wallet</button>
      </div>
      <div class="panel-body">
        <div class="wallets-grid">
          ${wallets.map(w => {
            const [clr, iconHtml] = walletMeta(w.type);
            const isShared = !w.user;
            return `
            <div class="wallet-card" style="--card-color: ${clr}">
              <div class="wallet-card-header">
                <div class="wallet-type-badge">${w.type.toUpperCase()}</div>
                <div class="wallet-card-actions">
                  <button class="wallet-action-btn edit-wallet-btn" 
                    data-id="${w.id}" data-name="${w.name}" data-type="${w.type}" 
                    data-balance="${w.balance}" data-icon="${w.icon || 'ph-wallet'}">
                    <i class="ph-fill ph-pencil-simple"></i>
                  </button>
                  <button class="wallet-action-btn delete-wallet-btn delete" data-id="${w.id}" data-name="${w.name}">
                    <i class="ph-fill ph-trash"></i>
                  </button>
                </div>
              </div>
              <div class="wallet-card-body">
                <div class="wallet-icon-wrap" style="background:${clr}1a; color:${clr}">
                  ${renderIcon(w.icon, iconHtml)}
                </div>
                <div class="wallet-balance-wrap">
                  <div class="wallet-balance-label">Current Balance</div>
                  <div class="wallet-balance-value">Rp ${fmt(w.balance)}</div>
                </div>
              </div>
              <div class="wallet-card-footer">
                <div class="wallet-name">${w.name}</div>
                <div class="wallet-owner-badge">
                  ${isShared ? '<i class="ph-fill ph-users"></i> Bersama' : `<i class="ph-fill ph-user"></i> ${w.user.name.split(' ')[0]}`}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function setupWalletListeners() {
  document.querySelectorAll('.edit-wallet-btn').forEach(btn => {
    btn.onclick = () => openWalletModal({
      id: btn.dataset.id,
      name: btn.dataset.name,
      type: btn.dataset.type,
      balance: btn.dataset.balance,
      icon: btn.dataset.icon
    });
  });
  document.querySelectorAll('.delete-wallet-btn').forEach(btn => {
    btn.onclick = () => confirmDelete(`Delete wallet "${btn.dataset.name}"?`, async () => {
      await api(`/households/${state.householdId}/wallets/${btn.dataset.id}`, 'DELETE');
      toast('Wallet deleted!'); await refreshAll(); renderPage('wallets');
    });
  });
  if (document.getElementById('new-wallet-btn')) {
    document.getElementById('new-wallet-btn').onclick = () => openWalletModal();
  }
}

function pageCategories() {
  const { categories } = state;
  const exp = categories.filter(c => c.type === 'expense');
  const inc = categories.filter(c => c.type === 'income');

  const renderCatCol = (title, items, id, active) => `
    <div id="${id}" class="tab-content ${active ? 'active' : ''}">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">${title}</span>
          <button class="btn btn-ghost btn-sm new-cat-btn" data-type="${title.toLowerCase().includes('expense') ? 'expense' : 'income'}"><i class="ph ph-plus" style="margin-right:2px"></i> Add</button>
        </div>
        <div class="panel-body">
          ${items.length === 0 ? `<p style="text-align:center;color:var(--text-3);padding:2rem">No categories</p>` :
        items.map(c => `
              <div class="list-item">
                <div class="list-icon" style="background:var(--surface-2)">${renderIcon(c.icon, '<i class="ph ph-tag"></i>')}</div>
                <div class="list-main">
                  <div class="list-name">${c.name}</div>
                  <div class="list-sub">${c.budget > 0 ? `Budget: Rp ${fmt(c.budget)}` : 'No budget'}</div>
                </div>
                <div style="display:flex;gap:0.5rem">
                  <button class="btn btn-ghost btn-sm edit-cat-btn" data-id="${c.id}" data-name="${c.name}" data-type="${c.type}" data-icon='${c.icon || ""}'><i class="ph-fill ph-pencil-simple"></i></button>
                  <button class="btn btn-danger btn-sm delete-cat-btn" data-id="${c.id}" data-name="${c.name}"><i class="ph-fill ph-trash"></i></button>
                </div>
              </div>`).join('')}
        </div>
      </div>
    </div>`;

  return `
    <div class="segmented-tabs">
      <button class="tab-btn active" onclick="switchTab('tab-exp', this)">Expense</button>
      <button class="tab-btn" onclick="switchTab('tab-inc', this)">Income</button>
    </div>
    <div style="position:relative">
      ${renderCatCol('Expense Categories', exp, 'tab-exp', true)}
      ${renderCatCol('Income Categories', inc, 'tab-inc', false)}
    </div>`;
}

function setupCatListeners() {
  document.querySelectorAll('.edit-cat-btn').forEach(btn => {
    btn.onclick = () => openCategoryModal({
      id: btn.dataset.id, name: btn.dataset.name, type: btn.dataset.type, icon: btn.dataset.icon
    });
  });
  document.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.onclick = () => confirmDelete(`Delete category "${btn.dataset.name}"?`, async () => {
      await api(`/households/${state.householdId}/categories/${btn.dataset.id}`, 'DELETE');
      toast('Category deleted!'); await refreshAll(); renderPage('categories');
    });
  });
  document.querySelectorAll('.new-cat-btn').forEach(btn => {
    btn.onclick = () => openCategoryModal(null, btn.dataset.type);
  });
}

function groupTxsByDate(txs) {
  const groups = {};
  txs.forEach(tx => {
    const d = tx.transaction_date;
    if (!groups[d]) groups[d] = { date: d, txs: [], total: 0 };
    groups[d].txs.push(tx);
    const amt = Number(tx.amount);
    groups[d].total += (tx.type === 'income' ? amt : tx.type === 'expense' ? -amt : 0);
  });
  return Object.values(groups).sort((a,b) => b.date.localeCompare(a.date));
}

function pageTxHistory() {
  const txs = state.transactions;
  if(txs.length === 0) return `<div class="panel"><div class="panel-body" style="padding:5rem;text-align:center;color:var(--text-3);font-weight:500">No transactions recorded yet.</div></div>`;
  
  const grouped = groupTxsByDate(txs);
  return `
    <div class="panel">
      <div class="panel-header" style="border-bottom:1px solid var(--border);padding:1.25rem 1.75rem;">
        <span class="panel-title" style="font-size:1.25rem;font-weight:800;letter-spacing:-0.03em">Transactions</span>
        <span style="font-size:0.8rem;color:var(--text-3);font-weight:700">${txs.length} result(s)</span>
      </div>
      <div class="panel-body" style="padding:0">
        ${grouped.map(grp => {
          const dObj = new Date(grp.date);
          const day = dObj.getDate();
          const dayName = dObj.toLocaleDateString('en-US', {weekday:'long'});
          const monthYear = dObj.toLocaleDateString('en-US', {month:'long', year:'numeric'});
          const totStr = grp.total > 0 ? '+' + fmt(grp.total) : fmt(grp.total);
          const totColor = grp.total > 0 ? '#3b82f6' : grp.total < 0 ? '#ef4444' : 'var(--text-3)';
          return `
            <div class="tx-group" style="padding:1.25rem 1.75rem; border-bottom:1px solid var(--border);">
              <div class="tx-group-header" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:1rem;margin-bottom:0.5rem;">
                <div style="display:flex;align-items:center;gap:1rem;">
                  <div style="font-size:2.25rem;font-weight:400;color:var(--text-1);line-height:1;letter-spacing:-0.05em">${day}</div>
                  <div style="display:flex;flex-direction:column;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:2px">${dayName}</div>
                    <div style="font-size:0.85rem;font-weight:600;color:var(--text-2);letter-spacing:0.02em">${monthYear}</div>
                  </div>
                </div>
                <div style="font-weight:800;color:${totColor};font-size:1.1rem">${totStr}</div>
              </div>
              <div class="tx-list" style="display:flex;flex-direction:column;gap:0.5rem">
                ${grp.txs.map(tx => txRow(tx, true)).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function setupTxListeners() {
  document.querySelectorAll('.delete-tx-btn').forEach(btn => {
    btn.onclick = () => confirmDelete(
      `Delete this transaction?`,
      async () => {
        await api(`/households/${state.householdId}/transactions/${btn.dataset.id}`, 'DELETE');
        toast('Transaction deleted!'); await refreshAll(); renderPage('transactions');
      }
    );
  });
  document.querySelectorAll('.edit-tx-btn').forEach(btn => {
    btn.onclick = () => {
      const tx = state.transactions.find(t => t.id === parseInt(btn.dataset.id));
      if (tx) {
        openTransactionModal(tx);
      }
    };
  });
  document.querySelectorAll('.clickable-tx').forEach(el => {
    el.onclick = () => {
      const tx = state.transactions.find(t => t.id === parseInt(el.dataset.id));
      if (tx) openTransactionDetailModal(tx);
    };
  });
}

function openTransactionDetailModal(tx) {
  const cat = state.categories.find(c => c.id === tx.category_id);
  const wallet = state.wallets.find(w => w.id === tx.wallet_id);
  const toWallet = tx.to_wallet_id ? state.wallets.find(w => w.id === tx.to_wallet_id) : null;
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const isAdjustment = tx.type === 'adjustment';
  const amtColor = isAdjustment ? 'var(--amber)' : isTransfer ? 'var(--text-1)' : isIncome ? 'var(--emerald)' : 'var(--rose)';

  openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">Detail Transaksi</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <div style="text-align:center;padding:1.5rem 0;border-bottom:1px solid var(--border-light)">
          <div style="font-size:0.85rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Amount</div>
          <div style="font-size:2rem;font-weight:800;color:${amtColor}">${isIncome ? '+' : tx.type === 'expense' ? '-' : ''}Rp ${fmt(tx.amount)}</div>
          <div style="font-size:0.85rem;color:var(--text-2);margin-top:0.25rem">${fdate(tx.transaction_date)}</div>
        </div>
        
        <div style="padding:1.5rem 0">
          <div class="detail-row" style="display:flex;justify-content:space-between;margin-bottom:1rem">
            <span style="color:var(--text-3);font-weight:600">Kategori</span>
            <span style="font-weight:700;color:var(--text-1)">${cat?.name || (isAdjustment ? 'Penyesuaian' : isTransfer ? 'Transfer' : 'Uncategorized')}</span>
          </div>
          <div class="detail-row" style="display:flex;justify-content:space-between;margin-bottom:1rem">
            <span style="color:var(--text-3);font-weight:600">Dompet</span>
            <span style="font-weight:700;color:var(--text-1)">${wallet?.name || 'Unknown'} ${isTransfer ? ` → ${toWallet?.name || '?'}` : ''}</span>
          </div>
          <div class="detail-row" style="display:flex;justify-content:space-between;margin-bottom:1rem">
            <span style="color:var(--text-3);font-weight:600">Keterangan</span>
            <span style="font-weight:700;color:var(--text-1);text-align:right">${tx.description || '-'}</span>
          </div>
          <div class="detail-row" style="display:flex;justify-content:space-between;margin-bottom:1rem">
            <span style="color:var(--text-3);font-weight:600">Oleh</span>
            <span style="font-weight:700;color:var(--text-1)">${tx.user?.name || 'System'}</span>
          </div>
          
          ${(tx.image_path || tx.receipt_group?.image_path) ? `
          <div style="margin-top:1.5rem">
            <details style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);background:var(--surface-1)">
              <summary style="padding:0.75rem 1rem;font-size:0.85rem;font-weight:700;color:var(--text-2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;user-select:none">
                <span style="display:flex;align-items:center;gap:0.5rem"><i class="ph-bold ph-receipt"></i> Foto Struk</span>
                <i class="ph-bold ph-caret-down toggle-icon"></i>
              </summary>
              <div style="padding:0;border-top:1px solid var(--border);background:var(--surface-2);cursor:pointer" onclick="window.open('${tx.image_path || tx.receipt_group.image_path}', '_blank')">
                <img src="${tx.image_path || tx.receipt_group.image_path}" style="width:100%;height:auto;display:block" alt="Receipt">
                <div style="padding:0.5rem;text-align:center;font-size:0.75rem;color:var(--text-3);font-weight:600;background:rgba(0,0,0,0.05)">Click to view full image</div>
              </div>
            </details>
          </div>
          ` : ''}
        </div>
        
        <div style="display:flex;gap:0.75rem;margin-top:1rem">
          ${!isAdjustment ? `<button class="btn btn-primary btn-full edit-tx-btn" data-id="${tx.id}"><i class="ph-fill ph-pencil-simple"></i> Edit</button>` : ''}
          <button class="btn btn-danger btn-full delete-tx-btn" data-id="${tx.id}"><i class="ph-fill ph-trash"></i> Hapus</button>
        </div>
      </div>
    </div>
  `);
  
  // Re-attach listeners for the buttons inside the detail modal
  setupTxListeners();
}

function txRow(tx, detailed = false) {
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const isAdjustment = tx.type === 'adjustment';

  const amtClr = isAdjustment ? 'var(--amber)' : isTransfer ? 'var(--text-1)' : isIncome ? 'var(--emerald)' : 'var(--rose)';
  const iconBaseClr = isAdjustment ? 'var(--amber)' : isTransfer ? 'var(--primary)' : isIncome ? 'var(--emerald)' : 'var(--rose)';
  const iconBg = isAdjustment ? 'var(--amber-subtle)' : isTransfer ? 'var(--primary-subtle)' : isIncome ? 'var(--emerald-subtle)' : 'var(--rose-subtle)';
  const amtPfx = isAdjustment ? '' : isTransfer ? '' : isIncome ? '+' : '-';
  const catName = tx.category?.name || (isAdjustment ? 'Penyesuaian Saldo' : isTransfer ? 'Transfer' : 'Uncategorized');
  const catIcon = tx.category?.icon || (isAdjustment ? '<i class="ph-fill ph-sliders-horizontal"></i>' : isTransfer ? '<i class="ph-fill ph-swap"></i>' : '<i class="ph-fill ph-tag"></i>');
  const userName = tx.user?.name || 'User';

  return `
    <div class="tx-item ${isAdjustment ? 'adjustment' : ''}">
      <div class="tx-icon" style="background:${iconBg};color:${iconBaseClr}">
        ${renderIcon(catIcon)}
      </div>
      <div class="tx-info clickable-tx" data-id="${tx.id}">
        <div class="tx-title">${catName}</div>
        <div class="tx-meta">
          ${tx.description ? `<span style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tx.description}</span>` : `<span style="opacity:0.6">${catName}</span>`} 
          <span style="opacity:0.3">•</span> 
          <span><i class="ph-fill ph-user-circle" style="color:var(--text-3);font-size:1.1em;vertical-align:middle;margin-right:2px"></i> ${userName.split(' ')[0]}</span>
          ${tx.image_path ? ` <span style="color:var(--emerald);font-size:0.8rem;margin-left:4px"><i class="ph-fill ph-image"></i></span>` : ''}
        </div>
      </div>
      <div class="tx-amount-wrap clickable-tx" data-id="${tx.id}">
        <div class="tx-amount" style="color:${amtClr}">${amtPfx}Rp ${fmt(tx.amount)}</div>
        ${detailed ? `<div class="tx-amount-meta">${fdate(tx.transaction_date)}</div>` : ''}
      </div>
      ${detailed ? `
        ${!isAdjustment ? `
        <button class="btn btn-ghost btn-sm edit-tx-btn" data-id="${tx.id}" style="margin-left:0.75rem;padding:0.4rem;color:var(--text-2);border-radius:10px;background:var(--surface-2)">
          <i class="ph-fill ph-pencil-simple"></i>
        </button>
        ` : ''}
        <button class="btn btn-ghost btn-sm delete-tx-btn" data-id="${tx.id}" style="${!isAdjustment ? 'margin-left:0.25rem;' : 'margin-left:0.75rem;'}padding:0.4rem;color:var(--rose);border-radius:10px;background:var(--rose-subtle)">
          <i class="ph-fill ph-trash"></i>
        </button>
      ` : ''}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLET MODAL
// ─────────────────────────────────────────────────────────────────────────────
function openWalletModal(wallet = null) {
  const editing = !!wallet;
  const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${editing ? 'Edit Wallet' : 'Add Wallet'}</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <form id="wallet-form">
          <div class="form-field">
            <label>Wallet Name</label>
            <input id="w-name" type="text" class="form-input no-icon" placeholder="e.g. BCA Suami" value="${wallet?.name || ''}" required>
          </div>
          <div class="form-field">
            <label>Icon</label>
            ${renderIconPicker(wallet?.icon || '<i class="ph-fill ph-wallet"></i>', 'w-picker')}
          </div>
          <div class="form-field">
            <label>Type</label>
            <select id="w-type" class="form-input">
              <option value="bank" ${wallet?.type === 'bank' ? 'selected' : ''}>🏦 Bank</option>
              <option value="cash" ${wallet?.type === 'cash' ? 'selected' : ''}>💵 Cash</option>
              <option value="e-wallet" ${wallet?.type === 'e-wallet' ? 'selected' : ''}>📱 E-Wallet</option>
            </select>
          </div>
          <div class="form-field">
            <label>${editing ? 'Current Balance' : 'Opening Balance'}</label>
            <div class="input-wrap">
              <span class="input-icon" style="font-size:.8rem;color:var(--text-2)">Rp</span>
              <input id="w-balance" type="number" class="form-input" placeholder="0" value="${wallet?.balance || 0}" min="0">
            </div>
          </div>
          <div class="form-field">
            <label>Owner (Optional for Shared)</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-user"></i></span>
              <select id="w-user-id" class="form-input">
                <option value="">Shared Wallet (Family)</option>
                ${state.members.map(m => `<option value="${m.id}" ${wallet?.user_id == m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="w-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">${editing ? 'Update Wallet' : 'Create Wallet'}</button>
        </form>
      </div>
    </div>`);

  overlay.querySelector('#wallet-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Saving…'; btn.disabled = true;
    const body = { 
      name: document.getElementById('w-name').value, 
      type: document.getElementById('w-type').value, 
      icon: document.getElementById('w-picker-input').value,
      balance: parseFloat(document.getElementById('w-balance').value) || 0,
      user_id: document.getElementById('w-user-id').value || null
    };
    try {
      if (editing) {
        await api(`/households/${state.householdId}/wallets/${wallet.id}`, 'PUT', body);
        toast('Wallet updated!');
      } else {
        await api(`/households/${state.householdId}/wallets`, 'POST', body);
        toast('Wallet created!');
      }
      closeModal(); await refreshAll(); renderPage('wallets');
    } catch (err) {
      document.getElementById('w-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = editing ? 'Update Wallet' : 'Create Wallet'; btn.disabled = false;
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY MODAL (Create/Edit)
// ─────────────────────────────────────────────────────────────────────────────
function openCategoryModal(cat = null) {
  const editing = !!cat;
  const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${editing ? 'Edit Category' : 'Add Category'}</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <form id="cat-form">
          <div class="form-field">
            <label>Category Name</label>
            <input id="c-name" type="text" class="form-input no-icon" placeholder="e.g. Makan Siang" value="${cat?.name || ''}" required>
          </div>
          <div class="form-field">
            <label>Icon</label>
            ${renderIconPicker(cat?.icon || '<i class="ph ph-tag"></i>', 'c-picker')}
          </div>
          <div class="form-field">
            <label>Type</label>
            <select id="c-type" class="form-input">
              <option value="expense" ${cat?.type === 'expense' ? 'selected' : ''}><i class="ph-fill ph-trend-down"></i> Expense</option>
              <option value="income" ${cat?.type === 'income' ? 'selected' : ''}><i class="ph-fill ph-trend-up"></i> Income</option>
            </select>
          </div>
          <div id="c-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">${editing ? 'Update Category' : 'Create Category'}</button>
        </form>
      </div>
    </div>`);

  overlay.querySelector('#cat-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Saving…'; btn.disabled = true;
    const body = { 
      name: document.getElementById('c-name').value, 
      type: document.getElementById('c-type').value,
      icon: document.getElementById('c-picker-input').value
    };
    try {
      if (editing) {
        await api(`/households/${state.householdId}/categories/${cat.id}`, 'PUT', body);
        toast('Category updated!');
      } else {
        await api(`/households/${state.householdId}/categories`, 'POST', body);
        toast('Category created!');
      }
      closeModal(); await refreshAll(); renderPage('categories');
    } catch (err) {
      document.getElementById('c-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = editing ? 'Update Category' : 'Create Category'; btn.disabled = false;
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION MODAL (Create)
// ─────────────────────────────────────────────────────────────────────────────
function openTransactionModal(editTx = null) {
  const wallets = state.wallets;
  const cats = state.categories;
  let currentType = editTx ? editTx.type : 'expense';

  const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${editTx ? 'Edit Transaction' : 'New Transaction'}</span>
          <div style="display:flex;align-items:center;gap:0.5rem">
            ${!editTx ? `<button type="button" id="scan-receipt-btn" class="btn btn-ghost btn-sm" style="color:var(--emerald);background:var(--emerald-subtle);font-weight:700" title="Scan struk untuk autofill">
              <i class="ph-fill ph-camera"></i> Scan Struk
            </button>` : ''}
            <button class="modal-close"><i class="ph ph-x"></i></button>
          </div>
        </div>
        <div class="type-switcher">
          <button class="type-btn active-expense" data-type="expense"><i class="ph-fill ph-trend-down"></i> Expense</button>
          <button class="type-btn" data-type="income"><i class="ph-fill ph-trend-up"></i> Income</button>
          <button class="type-btn" data-type="transfer"><i class="ph ph-arrows-left-right"></i> Transfer</button>
        </div>
        <input type="hidden" id="tx-type" value="expense">
        <input type="file" id="scan-receipt-input" accept="image/*" capture="environment" style="display:none">
        
        <div id="scan-loading" style="display:none;background:var(--emerald-subtle);color:var(--emerald);padding:0.75rem;border-radius:var(--radius);margin-bottom:1.5rem;text-align:center;font-weight:600;font-size:0.9rem;border:1px solid rgba(16,185,129,0.3)">
          <i class="ph-fill ph-spinner-gap" style="animation:spin 1s linear infinite"></i> AI is reading your receipt...
        </div>

        <div class="amount-field">
          <div class="amount-label">Amount</div>
          <div class="amount-row">
            <span class="amount-currency">Rp</span>
            <input type="number" id="tx-amount" class="amount-input" placeholder="0" min="1" required autofocus autocomplete="off">
          </div>
        </div>
        <form id="tx-form">
          <div class="form-field">
            <label id="label-wallet">Wallet</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-wallet"></i></span>
              <select id="tx-wallet" class="form-input" required>
                ${wallets.map(w => `<option value="${w.id}">${w.name} · Rp ${fmt(w.balance)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-field" id="to-wallet-field" style="display:none">
            <label>To Wallet</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-target"></i></span>
              <select id="tx-to-wallet" class="form-input">
                ${wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-field" id="admin-fee-field" style="display:none">
            <label>Biaya Admin (Opsional)</label>
            <div class="input-wrap">
              <span class="input-icon" style="font-size:0.9rem">Rp</span>
              <input type="number" id="tx-admin-fee" class="form-input" placeholder="0" min="0">
            </div>
          </div>
          <div class="form-field" id="category-field">
            <label>Category</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-tag"></i></span>
              <select id="tx-category" class="form-input">
                <option value="">Select category (optional)</option>
                ${cats.filter(c => c.type === 'expense').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-field">
              <label>Date</label>
              <div class="input-wrap">
                <span class="input-icon"><i class="ph ph-calendar"></i></span>
                <input type="date" id="tx-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
            </div>
            <div class="form-field">
              <label>Description (optional)</label>
              <div class="input-wrap">
                <span class="input-icon"><i class="ph ph-note-pencil"></i></span>
                <input type="text" id="tx-desc" class="form-input" placeholder="e.g. Groceries">
              </div>
            </div>
          </div>
          
          <div id="tx-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem">${editTx ? 'Save Changes' : 'Confirm Transaction'}</button>
          <input type="hidden" id="edit-tx-id" value="${editTx ? editTx.id : ''}">
        </form>
      </div>
    </div>`);

  // Receipt Scanner Logic
  const scanBtn = overlay.querySelector('#scan-receipt-btn');
  const scanInput = overlay.querySelector('#scan-receipt-input');
  const scanLoading = overlay.querySelector('#scan-loading');
  let scannedReceiptData = null; // holds full receipt payload when items detected

  function renderItemPreview(items, storeName) {
    const existing = overlay.querySelector('#receipt-items-preview');
    if (existing) existing.remove();
    if (!items || items.length === 0) return;

    const rows = items.map((item, i) => `
      <tr data-idx="${i}">
        <td style="padding:0.4rem 0.6rem;font-size:0.83rem;color:var(--text-1)">${item.name}</td>
        <td style="padding:0.4rem 0.6rem;font-size:0.83rem;text-align:center">${item.quantity}${item.unit ? ' '+item.unit : ''}</td>
        <td style="padding:0.4rem 0.6rem;font-size:0.83rem;text-align:right">Rp ${fmt(item.unit_price)}</td>
        <td style="padding:0.4rem 0.6rem;font-size:0.83rem;text-align:right;font-weight:700">Rp ${fmt(item.total_price)}</td>
        <td style="padding:0.4rem 0.2rem;text-align:center">
          <button class="btn-icon del-item-preview" data-idx="${i}" style="font-size:0.7rem;opacity:0.5" title="Hapus item"><i class="ph ph-x"></i></button>
        </td>
      </tr>`).join('');

    const box = document.createElement('div');
    box.id = 'receipt-items-preview';
    box.style.cssText = 'background:var(--bg-2);border:1px solid var(--emerald);border-radius:var(--radius);padding:0.75rem;margin-bottom:1rem;';
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--emerald)">
          <i class="ph-fill ph-receipt"></i> ${storeName || 'Receipt'} — ${items.length} items
        </span>
        <span style="font-size:0.7rem;color:var(--text-3)">Ini akan disimpan sebagai Struk</span>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;font-size:0.72rem;color:var(--text-3);padding:0.3rem 0.6rem;font-weight:600">Item</th>
            <th style="text-align:center;font-size:0.72rem;color:var(--text-3);padding:0.3rem 0.6rem;font-weight:600">Qty</th>
            <th style="text-align:right;font-size:0.72rem;color:var(--text-3);padding:0.3rem 0.6rem;font-weight:600">Satuan</th>
            <th style="text-align:right;font-size:0.72rem;color:var(--text-3);padding:0.3rem 0.6rem;font-weight:600">Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    const form = overlay.querySelector('#tx-form');
    form.insertBefore(box, form.firstChild);

    box.querySelectorAll('.del-item-preview').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        scannedReceiptData.items.splice(idx, 1);
        if (scannedReceiptData.items.length === 0) {
          scannedReceiptData = null;
          overlay.querySelector('#tx-submit-btn').textContent = 'Confirm Transaction';
        }
        renderItemPreview(scannedReceiptData?.items, scannedReceiptData?.store_name);
      };
    });
  }

  if (scanBtn && scanInput) {
    scanBtn.addEventListener('click', () => scanInput.click());
    scanInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      scanLoading.style.display = 'block';
      scanBtn.disabled = true;
      scanBtn.style.opacity = '0.5';

      const formData = new FormData();
      formData.append('image', file);
      formData.append('household_id', state.householdId);

      const submitBtn = overlay.querySelector('#tx-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
      }

      try {
        const response = await fetch(`${API_BASE}/receipts/scan`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + state.token,
            'X-Gemini-Key': GEMINI_API_KEY
          },
          body: formData
        });

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.message || 'Failed to scan receipt');

        // Always fill basic fields
        if (resData.amount || resData.total_amount) {
          document.getElementById('tx-amount').value = resData.total_amount || resData.amount;
        }
        if (resData.description) document.getElementById('tx-desc').value = resData.description;
        if (resData.purchase_date) document.getElementById('tx-date').value = resData.purchase_date;

        if (resData.predicted_category_name) {
          const catNameLower = resData.predicted_category_name.toLowerCase();
          const cat = state.categories.find(c => c.type === 'expense' && c.name.toLowerCase() === catNameLower);
          if (cat) document.getElementById('tx-category').value = cat.id;
        }

        ['tx-amount', 'tx-desc', 'tx-date', 'tx-category'].forEach(id => {
          const el = document.getElementById(id);
          if (el && el.value) { el.style.borderColor = 'var(--emerald)'; setTimeout(() => el.style.borderColor = '', 3000); }
        });

        // If items were detected, store and render preview
        if (resData.items && resData.items.length > 0) {
          scannedReceiptData = resData;
          scannedReceiptData.image_path = resData.image_path; // Store the saved image path
          renderItemPreview(resData.items, resData.store_name);
          if (submitBtn) submitBtn.textContent = 'Simpan Struk & Transaksi';
          toast(`Struk dibaca: ${resData.items.length} item dari ${resData.store_name || 'toko'}!`, 'success');
        } else {
          scannedReceiptData = null;
          toast('Struk dibaca! Tidak ada item detail terdeteksi.', 'success');
        }
      } catch (err) {
        const errEl = document.getElementById('tx-err');
        if (errEl) errEl.innerHTML = `<div class="error-msg"><i class="ph ph-warning"></i> Scan error: ${err.message}</div>`;
        toast(err.message, 'error');
      } finally {
        scanLoading.style.display = 'none';
        scanBtn.disabled = false;
        scanBtn.style.opacity = '1';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        }
        scanInput.value = '';
      }
    });
  }

  // Type switching
  overlay.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentType = btn.dataset.type;
      overlay.querySelectorAll('.type-btn').forEach(b => b.className = 'type-btn');
      btn.className = `type-btn active-${currentType}`;
      document.getElementById('tx-type').value = currentType;
      
      const isTransfer = currentType === 'transfer';
      document.getElementById('to-wallet-field').style.display = isTransfer ? 'block' : 'none';
      document.getElementById('admin-fee-field').style.display = isTransfer ? 'block' : 'none';
      document.getElementById('category-field').style.display = isTransfer ? 'none' : 'block';
      document.getElementById('label-wallet').textContent = isTransfer ? 'From Wallet' : 'Wallet';
      
      const catSel = document.getElementById('tx-category');
      if (isTransfer) {
        catSel.removeAttribute('required');
      } else {
        catSel.innerHTML = `<option value="">Select category (optional)</option>` +
          cats.filter(c => c.type === currentType).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    });
  });

  // Pre-fill form if editing
  if (editTx) {
    const defaultTypeBtn = overlay.querySelector(`.type-btn[data-type="${editTx.type}"]`);
    if (defaultTypeBtn) defaultTypeBtn.click();
    
    const amtInput = document.getElementById('tx-amount');
    if(amtInput) amtInput.value = Number(editTx.amount);
    
    document.getElementById('tx-wallet').value = editTx.wallet_id;
    if (editTx.type === 'transfer') {
      document.getElementById('tx-to-wallet').value = editTx.to_wallet_id || '';
      document.getElementById('tx-admin-fee').value = editTx.admin_fee || '';
    } else {
      setTimeout(() => { // wait for category list to populate
        document.getElementById('tx-category').value = editTx.category_id || '';
      }, 50);
    }
    const descInput = document.getElementById('tx-desc');
    if(descInput) descInput.value = editTx.description || '';
    
    const dateInput = document.getElementById('tx-date');
    if(dateInput && editTx.transaction_date) {
      dateInput.value = editTx.transaction_date.substring(0, 10);
    }
  }

  // Update submit btn id for dynamic label changes
  overlay.querySelector('#tx-form button[type=submit]').id = 'tx-submit-btn';

  overlay.querySelector('#tx-form').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('tx-submit-btn');
    
    // UI Feedback for validation
    const amountVal = document.getElementById('tx-amount').value;
    const amount = parseFloat(amountVal);
    if (!amountVal || isNaN(amount) || amount <= 0) {
      if (typeof toast === 'function') toast('Jumlah transaksi harus lebih dari 0.', 'error');
      btn.textContent = 'Simpan'; btn.disabled = false;
      return;
    }
    
    const type = document.getElementById('tx-type').value;
    const walletId = document.getElementById('tx-wallet').value;
    if (!walletId) {
      if (typeof toast === 'function') toast('Silakan pilih Dompet yang digunakan.', 'error');
      return;
    }
    
    btn.textContent = 'Menyimpan…'; btn.disabled = true;
    
    const catId = document.getElementById('tx-category')?.value || null;
    const desc = document.getElementById('tx-desc').value;
    const txDate = document.getElementById('tx-date').value || new Date().toISOString().split('T')[0];

    const editTxId = editTx ? editTx.id : null;

    btn.textContent = 'Menyimpan…'; btn.disabled = true;

    try {
      // If we have scanned items AND it's an expense AND not editing, save as a ReceiptGroup
      if (!editTxId && scannedReceiptData && scannedReceiptData.items?.length > 0 && type === 'expense') {
        const rgBody = {
          wallet_id: walletId,
          store_name: scannedReceiptData.store_name || desc || 'Struk Belanja',
          purchase_date: txDate,
          total_amount: amount,
          category_id: catId,
          notes: desc,
          image_path: scannedReceiptData.image_path,
          items: scannedReceiptData.items.map(it => ({
            name: it.name,
            quantity: it.quantity,
            unit: it.unit || null,
            unit_price: it.unit_price,
            total_price: it.total_price,
          })),
        };
        await api(`/households/${state.householdId}/receipt-groups`, 'POST', rgBody);
        toast('Struk & transaksi berhasil disimpan! <i class="ph-fill ph-receipt"></i>', 'success');
        closeModal();
        scannedReceiptData = null;
        await refreshAll();
        renderPage(state.activePage);
        return;
      }

      // Normal transaction save
      let payload = { type, wallet_id: walletId, amount, description: desc, transaction_date: txDate, category_id: catId || null };
      if (type === 'transfer') {
        payload.to_wallet_id = document.getElementById('tx-to-wallet').value;
        payload.admin_fee = parseFloat(document.getElementById('tx-admin-fee').value) || 0;
      }

      if (editTxId) {
        await api(`/households/${state.householdId}/transactions/${editTxId}`, 'PUT', payload);
        toast('Transaction updated!');
      } else {
        await api(`/households/${state.householdId}/transactions`, 'POST', payload);
        toast('Transaction saved!');
      }
      closeModal();
      await refreshAll();
      renderPage(state.activePage);
    } catch (err) {
      document.getElementById('tx-err').innerHTML = `<div class="error-msg"><i class="ph ph-warning"></i> ${err.message}</div>`;
      btn.textContent = editTx ? 'Update' : 'Confirm Transaction'; btn.disabled = false;
    }
  };
}

function showConfirm(message, onConfirm, { title = 'Konfirmasi', icon = '', btnText = 'Yes', btnClass = 'btn-primary', loadingText = 'Processing…', titleColor = 'var(--text-1)' } = {}) {
  const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:380px">
        <div class="modal-handle"></div>
        <div class="modal-head" style="color:${titleColor}">
          <span class="modal-title">${icon} ${title}</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:0 1.5rem 1.5rem">
          <p style="color:var(--text-2);font-size:0.95rem;margin-bottom:1.5rem;line-height:1.6">${message}</p>
          <div style="display:flex;gap:0.75rem;justify-content:flex-end">
            <button class="btn btn-ghost" id="cancel-confirm">Cancel</button>
          <button class="btn ${btnClass}" id="confirm-btn">${btnText}</button>
        </div>
      </div>
    </div>`);

  overlay.querySelector('#cancel-confirm').onclick = closeModal;
  overlay.querySelector('#confirm-btn').onclick = async () => {
    const btn = overlay.querySelector('#confirm-btn');
    btn.textContent = loadingText; btn.disabled = true;
    try { await onConfirm(); closeModal(); }
    catch (err) {
      toast(err.message, 'error');
      btn.textContent = btnText; btn.disabled = false;
    }
  };
}

function confirmDelete(message, onConfirm) {
  showConfirm(message, onConfirm, {
    title: 'Confirm Delete',
    icon: '<i class="ph-fill ph-trash"></i>',
    btnText: 'Yes, Delete',
    btnClass: 'btn-danger',
    loadingText: 'Deleting…',
    titleColor: 'var(--rose)'
  });
}

const roleColor = role => role === 'admin' ? 'var(--primary)' : 'var(--emerald)';
const roleBg = role => role === 'admin' ? 'rgba(14,165,233,.12)' : 'rgba(16,185,129,.12)';

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: MEMBERS (Household sharing)
// ─────────────────────────────────────────────────────────────────────────────
function pageMembers() {
  const members = state.members;
  const isAdmin = state.myRole === 'admin';

  const txByUser = {};
  state.transactions.forEach(tx => {
    const name = tx.user?.name || 'Unknown';
    if (!txByUser[name]) txByUser[name] = { count: 0, expense: 0, income: 0 };
    txByUser[name].count++;
    if (tx.type === 'expense') txByUser[name].expense += Number(tx.amount);
    if (tx.type === 'income') txByUser[name].income += Number(tx.amount);
  });

  return `
    <div class="panel">
      <div class="panel-header" style="border-bottom:1px solid var(--border);padding:1.25rem 1.75rem;">
        <span class="panel-title" style="font-size:1.25rem;font-weight:800;letter-spacing:-0.03em">Members</span>
        ${isAdmin ? `<button class="btn btn-ghost btn-sm" id="invite-btn-inline" style="color:var(--emerald);font-weight:800;"><i class="ph ph-plus" style="margin-right:2px"></i> Invite</button>` : ''}
      </div>
      <div class="panel-body" style="padding:1.5rem; display:flex; flex-direction:column; gap:1.5rem;">
          ${members.map((m, idx) => {
            const stats = txByUser[m.name] || { count: 0, expense: 0, income: 0 };
            const isLast = idx === members.length - 1;
            return `
              <div class="money-lover-member-card" style="display:flex;align-items:flex-start;padding-bottom:${isLast ? '0' : '1.5rem'}; border-bottom:${isLast ? 'none' : '1px solid var(--border)'};">
                <!-- Avatar -->
                <div style="width:52px;height:52px;border-radius:50%;background:var(--emerald);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;margin-right:1rem;flex-shrink:0;">
                  ${m.name.charAt(0).toUpperCase()}
                </div>
                
                <!-- Center Info -->
                <div style="flex:1;">
                  <div style="font-weight:800;font-size:1.15rem;color:var(--text-1);letter-spacing:-0.03em">${m.name}</div>
                  <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:1.25rem;font-weight:500">${stats.count} transaction${stats.count!==1?'s':''}</div>
                  
                  <div style="display:flex;gap:3rem;align-items:center;">
                    <div>
                      <div style="font-size:0.75rem;color:var(--text-3);font-weight:600;margin-bottom:0.2rem">Income</div>
                      <div style="font-size:1.05rem;font-weight:700;color:#3b82f6;letter-spacing:-0.02em">${fmt(stats.income)}</div>
                    </div>
                    <div>
                      <div style="font-size:0.75rem;color:var(--text-3);font-weight:600;margin-bottom:0.2rem">Expense</div>
                      <div style="font-size:1.05rem;font-weight:700;color:#ef4444;letter-spacing:-0.02em">${fmt(stats.expense)}</div>
                    </div>
                  </div>
                </div>

                <!-- Right Info -->
                <button class="see-details-btn btn btn-ghost btn-sm" data-id="${m.id}" data-name="${m.name}" style="color:var(--emerald);font-weight:700;font-size:0.9rem;display:flex;align-items:center;gap:0.3rem;border:1px solid rgba(16,185,129,0.25);">
                  See details <i class="ph-fill ph-caret-right"></i>
                </button>
              </div>`;
          }).join('')}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: GOALS (Financial Targets)
// ─────────────────────────────────────────────────────────────────────────────
function pageGoals() {
  const goals = state.goals;
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:1.5rem">
      ${goals.length === 0 ? `
        <div class="panel" style="grid-column: 1 / -1; padding: 4rem; text-align: center;">
          <div style="font-size: 3.5rem; margin-bottom: 1.5rem;"><i class="ph ph-target"></i></div>
          <h3 style="margin-bottom:0.5rem">No financial goals yet</h3>
          <p style="color: var(--text-3); margin-bottom: 2rem; font-weight:500">Start tracking your family savings and dreams today.</p>
          <button class="btn btn-primary" onclick="openGoalModal()"><i class="ph ph-plus" style="margin-right:2px"></i> Create Your First Goal</button>
        </div>
      ` : goals.map(goal => {
      const remaining = Math.max(0, goal.target_amount - goal.current_amount);
      const hasFrequency = goal.frequency && goal.frequency !== 'none';

      return `
        <div class="goal-card">
          <div class="goal-header">
            <div class="goal-marker" style="background: ${color}"></div>
            <div class="goal-title-wrap">
              <div class="goal-name">${goal.name}</div>
              <div class="goal-deadline">${goal.deadline ? 'Due ' + fdate(goal.deadline) : (hasFrequency ? '<i class="ph ph-arrows-left-right"></i> ' + goal.frequency : 'No deadline')}</div>
            </div>
            <div class="goal-actions" style="display: flex; gap: 0.25rem;">
              <button class="btn-icon add-item-btn" data-id="${goal.id}" title="Add Task"><i class="ph ph-plus" style="margin-right:2px"></i></button>
              <button class="btn-icon edit-goal-btn" data-id="${goal.id}" title="Edit"><i class="ph-fill ph-pencil-simple"></i></button>
              <button class="btn-icon delete-goal-btn" data-id="${goal.id}" title="Delete"><i class="ph-fill ph-trash"></i></button>
            </div>
          </div>
          <div class="goal-body">
            <div class="goal-progress-row">
              <div class="goal-progress-val">Rp ${fmt(goal.current_amount)}</div>
              <div class="goal-progress-pct">${pct}%</div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${pct}%; background: ${color}"></div>
            </div>
            <div class="goal-footer">
              <div class="goal-target">Target: Rp ${fmt(goal.target_amount)}</div>
              <div class="goal-remaining">${remaining > 0 ? 'Rp ' + fmt(remaining) + ' left' : 'Goal Reached! <i class="ph-fill ph-confetti"></i>'}</div>
            </div>
            
            ${hasFrequency ? `
            <div class="goal-periodic-info" style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); font-size: 0.85rem; color: var(--text-2);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Periodic Target (${goal.frequency})</span>
                <span style="font-weight: 600; color: var(--text-1);">Rp ${fmt(goal.target_per_period || 0)}</span>
              </div>
            </div>
            ` : ''}

            <!-- Checklist Section -->
            <div class="goal-items" style="margin-top: 1rem;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); font-weight: 700; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                Daily Checklist
                <span>${goal.items?.filter(i => i.is_completed).length || 0}/${goal.items?.length || 0}</span>
              </div>
              <div class="goal-item-list" style="display: flex; flex-direction: column; gap: 0.4rem;">
                ${(goal.items || []).length === 0 ? `<p style="font-size: 0.8rem; color: var(--text-3); font-style: italic;">No items yet.</p>` :
          goal.items.map(item => `
                  <div class="goal-checklist-item" style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem;">
                    <input type="checkbox" class="toggle-item-chk" data-goal-id="${goal.id}" data-item-id="${item.id}" ${item.is_completed ? 'checked' : ''} style="accent-color: ${color}">
                    <span style="flex: 1; ${item.is_completed ? 'text-decoration: line-through; color: var(--text-3);' : 'color: var(--text-2);'}">${item.title}</span>
                    <button class="btn-icon delete-item-btn" data-goal-id="${goal.id}" data-item-id="${item.id}" style="font-size: 0.7rem; opacity: 0.5;"><i class="ph ph-x"></i></button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>`;
    }).join('')}
    </div>`;
  }

  function setupGoalListeners() {
    document.querySelectorAll('.edit-goal-btn').forEach(btn => {
      btn.onclick = () => {
        const goal = state.goals.find(g => g.id == btn.dataset.id);
        openGoalModal(goal);
      };
    });
    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
      btn.onclick = () => confirmDelete(
        `Delete goal "<strong>${state.goals.find(g => g.id == btn.dataset.id)?.name}</strong>"?`,
        async () => {
          await api(`/households/${state.householdId}/goals/${btn.dataset.id}`, 'DELETE');
          toast('Goal deleted');
          await refreshGoals();
          renderPage('goals');
        }
      );
    });

    // Checklist Item Listeners
    document.querySelectorAll('.toggle-item-chk').forEach(chk => {
      chk.onchange = async () => {
        const { goalId, itemId } = chk.dataset;
        try {
          await api(`/households/${state.householdId}/goals/${goalId}/items/${itemId}/toggle`, 'POST');
          await refreshGoals();
          renderPage('goals');
        } catch (err) { toast(err.message, 'error'); chk.checked = !chk.checked; }
      };
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.onclick = async () => {
        const { goalId, itemId } = btn.dataset;
        try {
          await api(`/households/${state.householdId}/goals/${goalId}/items/${itemId}`, 'DELETE');
          await refreshGoals();
          renderPage('goals');
        } catch (err) { toast(err.message, 'error'); }
      };
    });

    document.querySelectorAll('.add-item-btn').forEach(btn => {
      btn.onclick = () => openAddItemModal(btn.dataset.id);
    });
  }

  function openAddItemModal(goalId) {
    const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width: 320px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title"><i class="ph ph-plus" style="margin-right:2px"></i> Add Checklist Item</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <form id="add-item-form">
          <div class="form-field">
            <label>Item Description</label>
            <input type="text" id="item-title" class="form-input no-icon" placeholder="e.g. Save 10k today" required autofocus>
          </div>
          <button type="submit" class="btn btn-primary btn-full">Add Item</button>
        </form>
      </div>
    </div>`);

    overlay.querySelector('#add-item-form').onsubmit = async e => {
      e.preventDefault();
      const title = document.getElementById('item-title').value;
      try {
        await api(`/households/${state.householdId}/goals/${goalId}/items`, 'POST', { title });
        closeModal();
        await refreshGoals();
        renderPage('goals');
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GOAL MODAL
  // ─────────────────────────────────────────────────────────────────────────────
  function openGoalModal(goal = null) {
    const isEdit = !!goal;
    const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width: 480px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${isEdit ? '<i class="ph-fill ph-pencil-simple"></i> Edit Goal' : '<i class="ph ph-target"></i> New Savings Goal'}</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <form id="goal-form">
          <div class="form-field">
            <label>Goal Name</label>
            <input type="text" id="goal-name" class="form-input" placeholder="e.g. New Car, Vacation" value="${goal?.name || ''}" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-field">
              <label>Target Total Amount</label>
              <input type="number" id="goal-target" class="form-input" placeholder="0" value="${goal?.target_amount || ''}" required>
            </div>
            <div class="form-field">
              <label>Current Savings</label>
              <input type="number" id="goal-current" class="form-input" placeholder="0" value="${goal?.current_amount || 0}">
            </div>
          </div>
          
          <div class="panel" style="margin: 0.5rem 0 1rem 0; background: var(--bg-2); border: 1px solid var(--border);">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-1); margin-bottom: 0.75rem;">Periodic Progress</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-field">
                <label>Frequency</label>
                <select id="goal-frequency" class="form-input">
                  <option value="none" ${goal?.frequency === 'none' ? 'selected' : ''}>None (Single Target)</option>
                  <option value="daily" ${goal?.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                  <option value="weekly" ${goal?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                  <option value="monthly" ${goal?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                  <option value="yearly" ${goal?.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
                </select>
              </div>
              <div class="form-field">
                <label>Periodic Target</label>
                <input type="number" id="goal-target-period" class="form-input" placeholder="e.g. 50000" value="${goal?.target_per_period || ''}">
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-field">
              <label>Deadline (Optional)</label>
              <input type="date" id="goal-deadline" class="form-input" value="${goal?.deadline || ''}">
            </div>
            <div class="form-field">
              <label>Color Tag</label>
              <input type="color" id="goal-color" class="form-input" value="${goal?.color || '#0ea5e9'}" style="padding: 2px; height: 42px;">
            </div>
          </div>
          <div id="goal-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top: 1rem;">
            ${isEdit ? 'Update Goal' : 'Establish Goal'}
          </button>
        </form>
      </div>
    </div>`);

    overlay.querySelector('#goal-form').onsubmit = async e => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      btn.textContent = 'Saving…'; btn.disabled = true;

      const payload = {
        name: document.getElementById('goal-name').value,
        target_amount: document.getElementById('goal-target').value,
        current_amount: document.getElementById('goal-current').value,
        deadline: document.getElementById('goal-deadline').value || null,
        color: document.getElementById('goal-color').value,
        frequency: document.getElementById('goal-frequency').value,
        target_per_period: document.getElementById('goal-target-period').value || null,
      };

      try {
        if (isEdit) {
          await api(`/households/${state.householdId}/goals/${goal.id}`, 'PUT', payload);
          toast('Goal updated!');
        } else {
          await api(`/households/${state.householdId}/goals`, 'POST', payload);
          toast('Goal established! <i class="ph ph-target"></i>');
        }
        closeModal();
        await refreshGoals();
        renderPage('goals');
      } catch (err) {
        document.getElementById('goal-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
        btn.textContent = isEdit ? 'Update Goal' : 'Establish Goal'; btn.disabled = false;
      }
    };
  }


function setupMemberListeners() {
  document.querySelectorAll('.remove-member-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(
      `Remove <strong>${btn.dataset.name}</strong> from the household? They will lose access to all shared data.`,
      async () => {
        await api(`/households/${state.householdId}/members/${btn.dataset.id}`, 'DELETE');
        toast(`${btn.dataset.name} has been unlinked.`);
        await refreshMembers();
        renderPage('members');
      }
    ));
  });
  document.querySelectorAll('.edit-role-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditMemberModal(btn.dataset.id, btn.dataset.name, btn.dataset.role));
  });
  document.querySelectorAll('.see-details-btn').forEach(btn => {
    btn.addEventListener('click', () => openMemberDetailModal(btn.dataset.id, btn.dataset.name));
  });
  // inline invite button inside the page body
  document.getElementById('invite-btn-inline')?.addEventListener('click', openInviteModal);
}

function openEditMemberModal(memberId, memberName, currentRole) {
  openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:380px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title"><i class="ph-fill ph-pencil-simple"></i> Edit Role</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:0 1.5rem">
          <p style="color:var(--text-2);margin-bottom:1.25rem;font-size:0.95rem">Change the role of <strong>${memberName}</strong> in this household.</p>
          <form id="edit-role-form">
            <div class="form-field">
              <label>Role</label>
              <div class="input-wrap">
                <span class="input-icon"><i class="ph ph-shield-star"></i></span>
                <select id="role-select" class="form-input">
                  <option value="member" ${currentRole === 'member' ? 'selected' : ''}>Member — Can view and add transactions</option>
                  <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin — Full control including invite &amp; manage</option>
                </select>
              </div>
            </div>
            <div id="edit-role-err"></div>
            <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem">Save Role</button>
          </form>
        </div>
      </div>
    </div>
  `);

  document.getElementById('edit-role-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const newRole = document.getElementById('role-select').value;
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
      await api(`/households/${state.householdId}/members/${memberId}`, 'PUT', { role: newRole });
      toast(`${memberName}'s role updated to ${newRole}.`);
      closeModal();
      await refreshMembers();
      renderPage('members');
    } catch (err) {
      document.getElementById('edit-role-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = 'Save Role'; btn.disabled = false;
    }
  };
}

function openMemberDetailModal(memberId, memberName) {
  const memberTxs = state.transactions.filter(tx => String(tx.user_id) === String(memberId) || tx.user?.name === memberName);
  const income    = memberTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense   = memberTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const transfer  = memberTxs.filter(t => t.type === 'transfer').reduce((s, t) => s + Number(t.amount), 0);

  const ownedWallets = state.wallets.filter(w => String(w.user_id) === String(memberId));
  const walletListHtml = ownedWallets.length === 0 
    ? '' 
    : `
    <div style="margin-bottom:1.5rem">
      <div style="font-size:0.85rem;font-weight:800;color:var(--text-3);text-transform:uppercase;margin-bottom:0.75rem;letter-spacing:0.05em">Member's Wallets</div>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${ownedWallets.map(w => {
          const [clr] = walletMeta(w.type);
          return `
          <div class="list-item" style="padding:0.75rem;background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)">
            <div class="list-icon" style="background:${clr}1a;color:${clr}">${renderIcon(w.icon, '<i class="ph ph-credit-card"></i>')}</div>
            <div class="list-main">
              <div class="list-name" style="font-weight:700">${w.name}</div>
              <div class="list-sub">${w.type.toUpperCase()}</div>
            </div>
            <div class="list-value" style="font-weight:800">Rp ${fmt(w.balance)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  const txRows = memberTxs.length === 0
    ? `<div style="padding:3rem;text-align:center;color:var(--text-3);font-weight:500"><i class="ph ph-receipt" style="font-size:2rem;display:block;margin-bottom:0.75rem"></i>Belum ada transaksi</div>`
    : `<div class="tx-list" style="display:flex;flex-direction:column;gap:0.5rem">
        ${memberTxs.slice(0, 30).map(tx => {
          const w = state.wallets.find(w => w.id === tx.wallet_id);
          const cat = state.categories.find(c => c.id === tx.category_id);
          const amtColor = tx.type === 'income' ? 'var(--emerald)' : tx.type === 'expense' ? 'var(--rose)' : 'var(--text-2)';
          const amtPrefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
          return `
            <div class="list-item" style="padding:0.75rem 0;border-bottom:1px solid var(--border)">
              <div class="list-icon" style="background:var(--surface-2);color:var(--text-2);font-size:1.1rem">
                ${tx.type === 'income' ? '<i class="ph-fill ph-trend-up"></i>' : tx.type === 'expense' ? '<i class="ph-fill ph-trend-down"></i>' : '<i class="ph ph-arrows-left-right"></i>'}
              </div>
              <div class="list-main">
                <div class="list-name">${tx.description || cat?.name || 'Transaction'}</div>
                <div class="list-sub">${fdate(tx.transaction_date)} · ${w?.name || 'Unknown wallet'}</div>
              </div>
              <div style="font-weight:700;font-size:0.95rem;color:${amtColor};white-space:nowrap">${amtPrefix}Rp ${fmt(tx.amount)}</div>
            </div>`;
        }).join('')}
      </div>`;

  openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:520px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--emerald);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;margin-right:0.75rem;vertical-align:middle">${memberName.charAt(0).toUpperCase()}</div>
            ${memberName}
          </span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>

        <!-- Summary Stats -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;padding:1.25rem 1.5rem;border-bottom:1px solid var(--border)">
          <div style="text-align:center">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-3);margin-bottom:0.4rem">Income</div>
            <div style="font-size:1rem;font-weight:800;color:var(--emerald)">Rp ${fmt(income)}</div>
          </div>
          <div style="text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border)">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-3);margin-bottom:0.4rem">Expense</div>
            <div style="font-size:1rem;font-weight:800;color:var(--rose)">Rp ${fmt(expense)}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-3);margin-bottom:0.4rem">Transfer</div>
            <div style="font-size:1rem;font-weight:800;color:var(--text-2)">Rp ${fmt(transfer)}</div>
          </div>
        </div>

        <!-- Transaction list -->
        <div style="padding:0 0 0.5rem 0;max-height:420px;overflow-y:auto">
          <div style="padding:0.75rem 1.5rem;font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);border-bottom:1px solid var(--border)">
            ${memberTxs.length} Transaction${memberTxs.length !== 1 ? 's' : ''}
          </div>
          <div style="padding:0 1.5rem">${txRows}</div>
        </div>
      </div>
    </div>`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: BUDGETS
// ─────────────────────────────────────────────────────────────────────────────
function pageBudgets() {
  const budgets = state.budgets;
  const cats = state.categories.filter(c => c.type === 'expense');
  const summary = state.summary;
  const expenses = summary?.expenses_by_category || [];

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="card-icon"><i class="ph ph-chart-pie-slice"></i></div>
        <div class="card-label">Total Monthly Budget</div>
        <div class="card-value">Rp ${fmt(budgets.reduce((s, b) => s + Number(b.amount), 0))}</div>
        <div class="card-sub">Allocated across ${budgets.length} categories</div>
      </div>
      <div class="stat-card">
        <div class="card-icon"><i class="ph ph-money"></i></div>
        <div class="card-label">Total Spent</div>
        <div class="card-value">Rp ${fmt(expenses.reduce((s, e) => s + Number(e.total), 0))}</div>
        <div class="card-sub">${summary?.monthly_expense ? Math.round((summary.monthly_expense / summary.monthly_budget) * 100) : 0}% of global budget used</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Category Budgets</span></div>
      <div class="panel-body" style="padding:0">
        ${cats.length === 0 ? `<p style="padding:3rem;text-align:center;color:var(--text-3)">No expense categories</p>` :
      cats.map(c => {
        const budget = budgets.find(b => b.category_id === c.id);
        const spentObj = expenses.find(e => e.category_id === c.id) || { total: 0 };
        const spent = Number(spentObj.total);
        const limit = budget ? Number(budget.amount) : 0;
        const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
        const clr = pct > 90 ? 'var(--rose)' : pct > 75 ? 'var(--amber)' : 'var(--emerald)';

        return `
            <div class="list-item" style="padding:1.5rem;border-bottom:1px solid var(--border)">
              <div class="list-icon" style="background:var(--surface-2)">${renderIcon(c.icon, '<i class="ph ph-tag"></i>')}</div>
              <div class="list-main">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
                  <div class="list-name">${c.name} <span class="pill" style="font-size:0.6rem;margin-left:0.5rem">${budget?.period || 'Not set'}</span></div>
                  <div class="list-value" style="font-weight:800">${limit > 0 ? `Rp ${fmt(spent)} / ${fmt(limit)}` : '<span style="color:var(--text-3);font-weight:500">No budget</span>'}</div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${pct}%;background:${clr}"></div>
                </div>
              </div>
              <div style="margin-left:1.5rem">
                <button class="btn btn-ghost btn-sm edit-budget-btn" 
                  data-cat-id="${c.id}" data-cat-name="${c.name}" data-amount="${limit}"
                  data-period="${budget?.period || 'monthly'}" data-start="${budget?.start_date || ''}" data-end="${budget?.end_date || ''}">
                  ${limit > 0 ? '<i class="ph-fill ph-pencil-simple"></i>' : '<i class="ph ph-plus" style="margin-right:2px"></i> Set'}
                </button>
              </div>
            </div>`;
      }).join('')}
      </div>
    </div>`;
}

function setupBudgetListeners() {
  document.querySelectorAll('.edit-budget-btn').forEach(btn => {
    btn.onclick = () => openBudgetModal({
      category_id: btn.dataset.catId,
      category_name: btn.dataset.catName,
      amount: btn.dataset.amount,
      period: btn.dataset.period,
      start_date: btn.dataset.start,
      end_date: btn.dataset.end
    });
  });
}

function openBudgetModal(budget = null) {
  const isEdit = budget && Number(budget.amount) > 0;
  const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:400px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${isEdit ? 'Edit Budget' : 'Set Budget'}</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <div style="text-align:center;margin-bottom:1.5rem">
          <div style="font-size:3rem;margin-bottom:.5rem"><i class="ph ph-chart-pie-slice"></i></div>
          <p style="color:var(--text-2);font-size:.9rem">${budget.category_name}</p>
        </div>
        <form id="budget-form">
          <div class="amount-field">
            <div class="amount-label">Limit Amount</div>
            <div class="amount-row">
              <span class="amount-currency">Rp</span>
              <input type="number" id="b-amount" class="amount-input" placeholder="0" value="${budget.amount || ''}" required autofocus>
            </div>
          </div>
          
          <div class="form-field">
            <label>Duration / Period</label>
            <select id="b-period" class="form-input">
              <option value="daily" ${budget.period === 'daily' ? 'selected' : ''}><i class="ph ph-calendar-blank"></i> Daily</option>
              <option value="weekly" ${budget.period === 'weekly' ? 'selected' : ''}><i class="ph ph-calendar-blank"></i> Weekly</option>
              <option value="monthly" ${budget.period === 'monthly' || !budget.period ? 'selected' : ''}><i class="ph ph-calendar-blank"></i> Monthly</option>
              <option value="yearly" ${budget.period === 'yearly' ? 'selected' : ''}><i class="ph ph-calendar-blank"></i> Yearly</option>
              <option value="once" ${budget.period === 'once' ? 'selected' : ''}>🔔 One Time</option>
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div class="form-field" style="margin-bottom:0">
              <label>Start Date</label>
              <input type="date" id="b-start" class="form-input" value="${budget.start_date || new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-field" style="margin-bottom:0">
              <label>End Date (Optional)</label>
              <input type="date" id="b-end" class="form-input" value="${budget.end_date || ''}">
            </div>
          </div>

          <div id="b-err"></div>
          <button type="submit" class="btn btn-primary btn-full">${isEdit ? 'Update Budget' : 'Set Budget'}</button>
          ${isEdit ? `<button type="button" id="del-budget-btn" class="btn btn-danger btn-full" style="margin-top:.75rem">Remove Budget</button>` : ''}
        </form>
      </div>
    </div>`);

  overlay.querySelector('#budget-form').onsubmit = async e => {
    e.preventDefault();
    const amount = document.getElementById('b-amount').value;
    const period = document.getElementById('b-period').value;
    const start_date = document.getElementById('b-start').value;
    const end_date = document.getElementById('b-end').value || null;
    try {
      await api(`/households/${state.householdId}/budgets`, 'POST', {
        category_id: budget.category_id,
        amount,
        period,
        start_date,
        end_date
      });
      toast('Budget saved!'); closeModal(); await refreshAll(); renderPage('budgets');
    } catch (err) { document.getElementById('b-err').innerHTML = `<div class="error-msg">${err.message}</div>`; }
  };

  overlay.querySelector('#del-budget-btn')?.addEventListener('click', async () => {
    const b = state.budgets.find(b => b.category_id == budget.category_id);
    if (!b) return;
    try {
      await api(`/households/${state.householdId}/budgets/${b.id}`, 'DELETE');
      toast('Budget removed'); closeModal(); await refreshAll(); renderPage('budgets');
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INVITE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function openInviteModal() {
  const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:440px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title"><i class="ph ph-envelope-simple"></i> Invite Member</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <p style="color:var(--text-2);font-size:.875rem;margin-bottom:1.5rem;line-height:1.6">
          Invite someone to join <strong>${state.household?.name || 'your household'}</strong>. They must already have a DompetKita account.
        </p>
        <form id="invite-form">
          <div class="form-field">
            <label>Email Address</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-envelope-simple"></i></span>
              <input id="inv-email" type="email" class="form-input" placeholder="member@email.com" required>
            </div>
          </div>
          <div class="form-field">
            <label>Role</label>
            <select id="inv-role" class="form-input">
              <option value="member"><i class="ph-fill ph-user"></i> Member – can view & add transactions</option>
              <option value="admin"><i class="ph-fill ph-crown"></i> Admin – full access including inviting others</option>
            </select>
          </div>
          <div id="inv-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">Send Invite</button>
        </form>
      </div>
    </div>`);

  overlay.querySelector('#invite-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Sending…'; btn.disabled = true;
    try {
      const r = await api(`/households/${state.householdId}/invite`, 'POST', {
        email: document.getElementById('inv-email').value,
        role: document.getElementById('inv-role').value,
      });
      closeModal();
      toast(`${r.data?.name || 'User'} added to household!`);
      await refreshMembers();
      renderPage('members');
    } catch (err) {
      document.getElementById('inv-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = 'Send Invite'; btn.disabled = false;
    }
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// PAGE: BILL REMINDERS
// ─────────────────────────────────────────────────────────────────────────────
function pageBillReminders() {
  const reminders = state.billReminders;
  const unpaid = reminders.filter(r => !r.is_paid);
  const paid = reminders.filter(r => r.is_paid);

  const renderList = (list, title, isUpcoming, id, active) => `
    <div id="${id}" class="tab-content ${active ? 'active' : ''}">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">${title}</span>
          ${isUpcoming ? `<button class="btn btn-primary btn-sm new-bill-btn"><i class="ph ph-plus" style="margin-right:2px"></i> New Bill</button>` : ''}
        </div>
        <div class="panel-body" style="padding:0">
          ${list.length === 0 ? `<p style="padding:3rem;text-align:center;color:var(--text-3)">No reminders.</p>` :
        list.map(r => `
              <div class="list-item" style="padding:1.25rem;border-bottom:1px solid var(--border)">
                <div class="list-icon" style="background:var(--surface-2)">${renderIcon(r.category?.icon, '<i class="ph ph-calendar-blank"></i>')}</div>
                <div class="list-main">
                  <div class="list-name">${r.name}</div>
                  <div class="list-sub">Due: ${fdate(r.due_date)} ${r.repeat_type !== 'none' ? '· <i class="ph ph-arrows-left-right"></i> ' + r.repeat_type : ''}</div>
                </div>
                <div class="list-value" style="text-align:right">
                  <div style="font-weight:800;color:var(--rose)">Rp ${fmt(r.amount)}</div>
                  <div style="display:flex;gap:0.4rem;margin-top:0.6rem;justify-content:flex-end">
                    ${isUpcoming ? `<button class="btn btn-success btn-sm mark-paid-btn" data-id="${r.id}"><i class="ph-fill ph-check-circle"></i> Pay</button>` : ''}
                    <button class="btn btn-ghost btn-sm edit-bill-btn" data-id="${r.id}"><i class="ph-fill ph-pencil-simple"></i></button>
                    <button class="btn btn-danger btn-sm delete-bill-btn" data-id="${r.id}"><i class="ph-fill ph-trash"></i></button>
                  </div>
                </div>
              </div>`).join('')}
        </div>
      </div>
    </div>`;

  return `
    <div class="segmented-tabs">
      <button class="tab-btn active" onclick="switchTab('tab-upb', this)">Upcoming</button>
      <button class="tab-btn" onclick="switchTab('tab-pdb', this)">Paid</button>
    </div>
    <div style="position:relative">
      ${renderList(unpaid, '<i class="ph-fill ph-clock"></i> Upcoming Bills', true, 'tab-upb', true)}
      ${renderList(paid, '<i class="ph-fill ph-check-circle"></i> Recently Paid', false, 'tab-pdb', false)}
    </div>`;
}

function setupBillReminderListeners() {
  document.querySelectorAll('.mark-paid-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const reminder = state.billReminders.find(r => r.id == id);
      openPayBillModal(reminder);
    };
  });
  document.querySelectorAll('.new-bill-btn').forEach(btn => {
    btn.onclick = () => openBillReminderModal();
  });
  document.querySelectorAll('.edit-bill-btn').forEach(btn => {
    btn.onclick = () => openBillReminderModal(state.billReminders.find(r => r.id == btn.dataset.id));
  });
  document.querySelectorAll('.delete-bill-btn').forEach(btn => {
    btn.onclick = () => confirmDelete('Delete this reminder?', async () => {
      await api(`/households/${state.householdId}/bill-reminders/${btn.dataset.id}`, 'DELETE');
      toast('Reminder deleted!'); await refreshAll(); renderPage('bill-reminders');
    });
  });
}

function openPayBillModal(reminder) {
  const wallets = state.wallets || [];
  if (wallets.length === 0) return toast('Silakan buat Dompet (Wallet) terlebih dahulu!', 'error');

  const html = `
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:400px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title"><i class="ph-fill ph-check-circle"></i> Bayar Tagihan</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <div style="background:var(--surface-2);padding:1.5rem;border-radius:var(--radius);margin-bottom:1.5rem;text-align:center">
          <div style="color:var(--text-2);font-size:0.95rem;margin-bottom:0.5rem">${reminder.name}</div>
          <div style="color:var(--rose);font-size:1.75rem;font-weight:800;letter-spacing:-0.03em">Rp ${fmt(reminder.amount)}</div>
          ${['monthly', 'yearly'].includes(reminder.repeat_type) ? `<div style="font-size:0.75rem;color:var(--emerald);margin-top:0.5rem;font-weight:600"><i class="ph-fill ph-arrows-clockwise"></i> Tagihan rutin untuk jatuh tempo berikutnya akan dijadwalkan otomatis.</div>` : ''}
        </div>
        <form id="pay-bill-form">
          <div class="form-field">
            <label>Tipe Eksekusi</label>
            <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;" class="tab-btn active" id="lbl-expense">
                <input type="radio" name="exec_type" value="expense" checked style="display:none" onchange="document.getElementById('dest-wallet-wrap').style.display='none'; document.getElementById('src-wallet-label').innerText='Dibayar dengan Dompet'; this.parentElement.classList.add('active'); document.getElementById('lbl-transfer').classList.remove('active');"> 
                <i class="ph ph-arrow-circle-down"></i> Pengeluaran (Uang Keluar)
              </label>
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;" class="tab-btn" id="lbl-transfer">
                <input type="radio" name="exec_type" value="transfer" style="display:none" onchange="document.getElementById('dest-wallet-wrap').style.display='block'; document.getElementById('src-wallet-label').innerText='Dari Dompet Asal'; this.parentElement.classList.add('active'); document.getElementById('lbl-expense').classList.remove('active');"> 
                <i class="ph ph-arrows-left-right"></i> Pindah Saldo Internal (Transfer)
              </label>
            </div>
          </div>

          <div class="form-field">
            <label id="src-wallet-label">Dibayar dengan Dompet</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-wallet"></i></span>
              <select id="pay-wallet" class="form-input" required>
                ${wallets.map(w => `<option value="${w.id}">${w.name} · Saldo Rp ${fmt(w.balance)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-field" id="dest-wallet-wrap" style="display:none">
            <label>Tujuan Pindah Saldo (Ke Dompet)</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-arrow-fat-right"></i></span>
              <select id="pay-target-wallet" class="form-input">
                ${wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div id="pay-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem;background:linear-gradient(135deg, var(--emerald), #059669);border:none;box-shadow:0 4px 12px rgba(16,185,129,0.3)">Konfirmasi & Selesai</button>
        </form>
      </div>
    </div>
  `;

  openModal(html);

  document.getElementById('pay-bill-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.querySelector('#pay-bill-form button[type=submit]');
    const wallet_id = document.getElementById('pay-wallet').value;
    const exec_type = document.querySelector('input[name="exec_type"]:checked').value;
    const target_wallet_id = document.getElementById('pay-target-wallet').value;

    if (exec_type === 'transfer' && wallet_id === target_wallet_id) {
       document.getElementById('pay-err').innerHTML = `<div class="error-msg">Dompet Asal dan Tujuan tidak boleh sama!</div>`;
       return;
    }

    btn.textContent = 'Memproses...'; btn.disabled = true;
    try {
      if (exec_type === 'expense') {
        await api(`/households/${state.householdId}/transactions`, 'POST', {
          amount: reminder.amount, 
          type: 'expense', 
          category_id: reminder.category_id,
          description: `Bayar Tagihan: ${reminder.name}`,
          transaction_date: new Date().toISOString().split('T')[0],
          wallet_id: wallet_id
        });
      } else {
        await api(`/households/${state.householdId}/transactions`, 'POST', {
          amount: reminder.amount, 
          type: 'transfer', 
          description: `Pindah Saldo Rutin: ${reminder.name}`,
          transaction_date: new Date().toISOString().split('T')[0],
          wallet_id: wallet_id,
          to_wallet_id: target_wallet_id
        });
      }
      
      await api(`/households/${state.householdId}/bill-reminders/${reminder.id}`, 'PUT', { ...reminder, is_paid: true });
      
      closeModal();
      toast('Tagihan berhasil dieksekusi!');
      await refreshAll();
      renderPage(state.activePage);
    } catch (err) {
      document.getElementById('pay-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = 'Konfirmasi & Selesai'; btn.disabled = false;
    }
  };
}

function openBillReminderModal(item = null) {
  const editing = !!item;
  const cats = state.categories.filter(c => c.type === 'expense');

  const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:440px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${editing ? 'Edit Bill Reminder' : 'Add Bill Reminder'}</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <form id="bill-form">
          <div class="form-field">
            <label>Bill Name</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-calendar-blank"></i></span>
              <input id="b-name" type="text" class="form-input" placeholder="e.g. Electricity Bill" value="${item?.name || ''}" required>
            </div>
          </div>
          <div class="form-field">
            <label>Amount</label>
            <div class="input-wrap">
              <span class="input-icon">Rp</span>
              <input id="b-amount" type="number" class="form-input" placeholder="0" value="${item?.amount || ''}" required>
            </div>
          </div>
          <div class="form-field">
            <label>Due Date</label>
            <input id="b-date" type="date" class="form-input no-icon" value="${item?.due_date || ''}" required>
          </div>
          <div class="form-field">
            <label>Category</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-tag"></i></span>
              <select id="b-cat" class="form-input">
                <option value="">No Category</option>
                ${cats.map(c => `<option value="${c.id}" ${item?.category_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-field">
            <label>Repeat Cycle</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-arrows-left-right"></i></span>
              <select id="b-repeat" class="form-input">
                <option value="none" ${item?.repeat_type === 'none' ? 'selected' : ''}>Does not repeat</option>
                <option value="monthly" ${item?.repeat_type === 'monthly' ? 'selected' : ''}>Monthly</option>
                <option value="yearly" ${item?.repeat_type === 'yearly' ? 'selected' : ''}>Yearly</option>
              </select>
            </div>
          </div>
          <div id="b-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem">${editing ? 'Update Bill' : 'Save Reminder'}</button>
        </form>
      </div>
    </div>`);

  overlay.querySelector('#bill-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Saving…'; btn.disabled = true;
    const body = {
      name: document.getElementById('b-name').value,
      amount: document.getElementById('b-amount').value,
      due_date: document.getElementById('b-date').value,
      category_id: document.getElementById('b-cat').value || null,
      repeat_type: document.getElementById('b-repeat').value,
    };
    try {
      if (editing) await api(`/households/${state.householdId}/bill-reminders/${item.id}`, 'PUT', body);
      else await api(`/households/${state.householdId}/bill-reminders`, 'POST', body);
      toast(editing ? 'Bill updated!' : 'Reminder saved!');
      closeModal(); await refreshAll(); renderPage('bill-reminders');
    } catch (err) {
      document.getElementById('b-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = editing ? 'Update Bill' : 'Save Reminder'; btn.disabled = false;
    }
  };
}


// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// PAGE: RECEIPTS & PRICE HISTORY
// ─────────────────────────────────────────────────────────────────────────────
function pageReceipts() {
  const groups = state.receiptGroups;
  return `
    <div style="display:flex;flex-direction:column;gap:1.5rem">

      <!-- Price History Search -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="ph-fill ph-magnifying-glass"></i> Price History — Cari Item</span>
        </div>
        <div class="panel-body">
          <p style="font-size:0.85rem;color:var(--text-3);margin-bottom:1rem">Ketik nama produk untuk melihat riwayat harga dari semua struk.</p>
          <div class="input-wrap" style="margin-bottom:1rem">
            <span class="input-icon"><i class="ph ph-magnifying-glass"></i></span>
            <input type="text" id="item-search-input" class="form-input" placeholder="e.g. Sabun Lifebuoy, Beras, Susu..." style="border-radius:var(--radius)">
          </div>
          <div id="item-search-results"></div>
        </div>
      </div>

      <!-- Receipt Groups List -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="ph-fill ph-receipt"></i> Riwayat Struk</span>
          <span style="font-size:0.8rem;color:var(--text-3);font-weight:500">${groups.length} struk tersimpan</span>
        </div>
        <div class="panel-body" style="padding:0">
          ${groups.length === 0 ? `
            <div style="padding:3rem;text-align:center;color:var(--text-3)">
              <div style="font-size:3rem;margin-bottom:1rem"><i class="ph ph-receipt"></i></div>
              <p style="font-weight:600">Belum ada struk tersimpan</p>
              <p style="font-size:0.85rem;margin-top:0.5rem">Scan struk belanja saat membuat transaksi baru untuk mulai tracking item.</p>
            </div>
          ` : groups.map(g => {
            const itemCount = g.items?.length || 0;
            const storeName = g.store_name || 'Toko';
            const walletName = g.wallet?.name || '';
            return `
              <div class="list-item receipt-group-row" data-id="${g.id}" style="padding:1.25rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''">
                <div class="list-icon" style="background:var(--primary-subtle);color:var(--primary)">
                  <i class="ph-fill ph-storefront"></i>
                </div>
                <div class="list-main">
                  <div class="list-name">${storeName}</div>
                  <div class="list-sub">${fdate(g.purchase_date)} · ${walletName}</div>
                </div>
                <div class="list-value" style="text-align:right">
                  <div style="font-weight:800;color:var(--rose)">Rp ${fmt(g.total_amount)}</div>
                  <div style="font-size:0.75rem;color:var(--text-3);margin-top:0.3rem">
                    <i class="ph ph-list-bullets"></i> ${itemCount} item${itemCount !== 1 ? 's' : ''}
                  </div>
                  <button class="btn btn-danger btn-sm delete-rg-btn" data-id="${g.id}" style="margin-top:0.5rem" onclick="event.stopPropagation()">
                    <i class="ph-fill ph-trash"></i>
                  </button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function setupReceiptListeners() {
  // Receipt group detail modal
  document.querySelectorAll('.receipt-group-row').forEach(row => {
    row.addEventListener('click', async () => {
      const id = row.dataset.id;
      try {
        const r = await api(`/households/${state.householdId}/receipt-groups/${id}`);
        openReceiptDetailModal(r.data);
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  // Delete receipt group
  document.querySelectorAll('.delete-rg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const group = state.receiptGroups.find(g => g.id == id);
      confirmDelete(
        `Hapus struk <strong>${group?.store_name || 'ini'}</strong>? Transaksi terkait juga akan dihapus dan saldo dikembalikan.`,
        async () => {
          await api(`/households/${state.householdId}/receipt-groups/${id}`, 'DELETE');
          toast('Struk dihapus.');
          await refreshAll();
          renderPage('receipts');
        }
      );
    });
  });

  // Price history search — debounced
  let searchTimer;
  const searchInput = document.getElementById('item-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      const q = searchInput.value.trim();
      const resultsEl = document.getElementById('item-search-results');
      if (q.length < 2) { resultsEl.innerHTML = ''; return; }
      resultsEl.innerHTML = `<div style="color:var(--text-3);font-size:0.85rem;padding:0.5rem 0"><i class="ph-fill ph-spinner-gap" style="animation:spin 1s linear infinite"></i> Mencari...</div>`;
      try {
        const r = await api(`/households/${state.householdId}/receipt-items/search?name=${encodeURIComponent(q)}`);
        const items = r.data;
        if (items.length === 0) {
          resultsEl.innerHTML = `<p style="color:var(--text-3);font-size:0.85rem;padding:0.5rem 0">Tidak ada item ditemukan untuk "<strong>${q}</strong>".</p>`;
          return;
        }
        // Render price history table
        const rows = items.map(it => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:0.6rem 0.75rem;font-size:0.85rem;color:var(--text-1);font-weight:600">${it.name}</td>
            <td style="padding:0.6rem 0.75rem;font-size:0.85rem;color:var(--text-2)">${it.store_name || '—'}</td>
            <td style="padding:0.6rem 0.75rem;font-size:0.85rem;color:var(--text-2)">${fdate(it.purchase_date)}</td>
            <td style="padding:0.6rem 0.75rem;font-size:0.85rem;text-align:center;color:var(--text-2)">${it.quantity}${it.unit ? ' '+it.unit : ''}</td>
            <td style="padding:0.6rem 0.75rem;font-size:0.85rem;text-align:right;font-weight:800;color:var(--primary)">Rp ${fmt(it.unit_price)}</td>
          </tr>`).join('');

        // Find min/max price
        const prices = items.map(it => Number(it.unit_price));
        const minP = Math.min(...prices), maxP = Math.max(...prices);
        const latestP = prices[0], oldestP = prices[prices.length - 1];
        const trend = latestP > oldestP ? `<span style="color:var(--rose)"><i class="ph-fill ph-trend-up"></i> Naik</span>` :
                      latestP < oldestP ? `<span style="color:var(--emerald)"><i class="ph-fill ph-trend-down"></i> Turun</span>` :
                      `<span style="color:var(--text-3)">Stabil</span>`;

        resultsEl.innerHTML = `
          <div style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
            <div class="stat-card" style="flex:1;min-width:120px;padding:0.75rem 1rem">
              <div class="card-label">Harga Terakhir</div>
              <div class="card-value" style="font-size:1.3rem">Rp ${fmt(latestP)}</div>
              <div class="card-sub">${trend}</div>
            </div>
            <div class="stat-card" style="flex:1;min-width:120px;padding:0.75rem 1rem">
              <div class="card-label">Termurah</div>
              <div class="card-value" style="font-size:1.3rem;color:var(--emerald)">Rp ${fmt(minP)}</div>
            </div>
            <div class="stat-card" style="flex:1;min-width:120px;padding:0.75rem 1rem">
              <div class="card-label">Termahal</div>
              <div class="card-value" style="font-size:1.3rem;color:var(--rose)">Rp ${fmt(maxP)}</div>
            </div>
            <div class="stat-card" style="flex:1;min-width:120px;padding:0.75rem 1rem">
              <div class="card-label">Total Pembelian</div>
              <div class="card-value" style="font-size:1.3rem">${items.length}×</div>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="border-bottom:2px solid var(--border)">
                  <th style="text-align:left;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Item</th>
                  <th style="text-align:left;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Toko</th>
                  <th style="text-align:left;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Tanggal</th>
                  <th style="text-align:center;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Qty</th>
                  <th style="text-align:right;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Harga/Satuan</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      } catch (err) {
        resultsEl.innerHTML = `<div class="error-msg">Gagal: ${err.message}</div>`;
      }
    }, 350);
  });
}

function openReceiptDetailModal(group) {
  const items = group.items || [];
  const rows = items.map(it => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:0.6rem 0.75rem;font-size:0.85rem;color:var(--text-1)">${it.name}</td>
      <td style="padding:0.6rem 0.75rem;font-size:0.85rem;text-align:center;color:var(--text-2)">${it.quantity}${it.unit ? ' '+it.unit : ''}</td>
      <td style="padding:0.6rem 0.75rem;font-size:0.85rem;text-align:right;color:var(--text-2)">Rp ${fmt(it.unit_price)}</td>
      <td style="padding:0.6rem 0.75rem;font-size:0.85rem;text-align:right;font-weight:700;color:var(--text-1)">Rp ${fmt(it.total_price)}</td>
    </tr>`).join('');

  openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:560px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title"><i class="ph-fill ph-storefront"></i> ${group.store_name || 'Struk Belanja'}</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>

        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem">
          <div class="stat-card" style="flex:1;min-width:130px;padding:0.75rem 1rem">
            <div class="card-label">Tanggal Beli</div>
            <div style="font-weight:700;font-size:1rem;margin-top:0.25rem">${fdate(group.purchase_date)}</div>
          </div>
          <div class="stat-card" style="flex:1;min-width:130px;padding:0.75rem 1rem">
            <div class="card-label">Total Pembayaran</div>
            <div style="font-weight:800;font-size:1.1rem;color:var(--rose);margin-top:0.25rem">Rp ${fmt(group.total_amount)}</div>
          </div>
          <div class="stat-card" style="flex:1;min-width:130px;padding:0.75rem 1rem">
            <div class="card-label">Pembayaran Via</div>
            <div style="font-weight:700;font-size:0.95rem;margin-top:0.25rem">${group.wallet?.name || '—'}</div>
          </div>
        </div>

        ${group.notes ? `<p style="font-size:0.85rem;color:var(--text-2);margin-bottom:1rem;padding:0.75rem;background:var(--bg-2);border-radius:var(--radius)"><i class="ph ph-note"></i> ${group.notes}</p>` : ''}

        ${items.length === 0 ? `<p style="text-align:center;color:var(--text-3);padding:2rem">Tidak ada detail item.</p>` : `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:2px solid var(--border)">
                <th style="text-align:left;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase">Item</th>
                <th style="text-align:center;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase">Qty</th>
                <th style="text-align:right;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase">Satuan</th>
                <th style="text-align:right;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border)">
                <td colspan="3" style="padding:0.75rem;font-weight:700;font-size:0.9rem">TOTAL</td>
                <td style="padding:0.75rem;text-align:right;font-weight:800;font-size:1rem;color:var(--rose)">Rp ${fmt(group.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`}
      </div>
    </div>`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────
window.openProfileModal = () => {
  const user = state.user;
  if(!user) return;
  const overlay = openModal(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:400px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title"><i class="ph-fill ph-gear"></i> Edit Profile</span>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <form id="profile-form">
          <div class="form-field">
            <label>Name</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-user"></i></span>
              <input id="up-name" type="text" class="form-input" value="${user.name}" required>
            </div>
          </div>
          <div class="form-field">
            <label>Email</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-envelope-simple"></i></span>
              <input id="up-email" type="email" class="form-input" value="${user.email}" required>
            </div>
          </div>
          <div class="form-field">
            <label>New Password <span style="font-size:0.75em;color:var(--text-3)">(Optional)</span></label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-lock-key"></i></span>
              <input id="up-pass" type="password" class="form-input" placeholder="Leave blank to keep current">
            </div>
          </div>
          <div class="form-field">
            <label>Confirm Password</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-lock-key"></i></span>
              <input id="up-conf" type="password" class="form-input" placeholder="Confirm new password">
            </div>
          </div>
          <div id="up-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem">Save Changes</button>
        </form>
      </div>
    </div>`);

  overlay.querySelector('#profile-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
      const data = {
        name: document.getElementById('up-name').value,
        email: document.getElementById('up-email').value,
      };
      const pass = document.getElementById('up-pass').value;
      const conf = document.getElementById('up-conf').value;
      if (pass) {
        if (pass !== conf) throw new Error("Passwords do not match");
        data.password = pass;
        data.password_confirmation = conf;
      }
      
      const r = await api('/user', 'PUT', data); // Since we added PUT /user
      const t = localStorage.getItem('dompetkita_token');
      localStorage.setItem('dompetkita_user', JSON.stringify(r.data));
      state.user = r.data;
      toast('Profile updated successfully!');
      closeModal();
      renderApp(); // re-render sidebar
    } catch(err) {
      document.getElementById('up-err').innerHTML = `<div class="error-msg">${err.message}</div>`;
      btn.textContent = 'Save Changes'; btn.disabled = false;
    }
  };
};


// AI Config page removed — key is hardcoded in GEMINI_API_KEY constant

// BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────
async function boot() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('token')) {
    state.token = urlParams.get('token');
    localStorage.setItem('token', state.token);
    window.history.replaceState({}, document.title, window.location.pathname);
    try {
      const userRes = await api('/user');
      saveSession(state.token, userRes);
      toast('Login via Google sukses!', 'success');
    } catch(e) {
      toast('Sesi tidak valid, silakan login ulang', 'error');
      state.token = null; localStorage.removeItem('token');
    }
  } else if (urlParams.has('error')) {
    setTimeout(() => toast('Google Login dibatalkan/gagal', 'error'), 500);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (state.token) { renderApp(); } else { renderAuth(); }
}
boot();

// ─────────────────────────────────────────────────────────────────────────────
// PWA SERVICE WORKER REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
// SYNC BALANCE (RECONCILIATION)
// ─────────────────────────────────────────────────────────────────────────────
window.openSyncBalanceModal = () => {
  const wallets = state.wallets || [];
  if (wallets.length === 0) return toast('No wallets available to sync.', 'error');

  const html = `
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:500px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <div class="modal-title">Sesuaikan Saldo</div>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        
        <div style="background:var(--amber-subtle);color:var(--amber);padding:1rem;border-radius:var(--radius);margin-bottom:1.5rem;font-size:0.9rem;border:1px solid rgba(245,158,11,0.2)">
          <i class="ph-fill ph-info"></i> Masukkan saldo <strong>faktual</strong> saat ini. Sistem akan otomatis menghitung selisih dan membuat transaksi <em>Adjustment</em> untuk menyamakan saldo database.
        </div>

        <form id="sync-form">
          <div class="form-field">
            <label>Pilih Dompet</label>
            <div class="input-wrap">
              <span class="input-icon"><i class="ph ph-wallet"></i></span>
              <select id="sync-wallet" class="form-input" required>
                ${wallets.map(w => `<option value="${w.id}">${w.name} · Saat ini: Rp ${fmt(w.balance)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-field">
            <label>Saldo Faktual (Rp)</label>
            <div class="input-wrap">
              <span class="input-icon">Rp</span>
              <input type="number" step="0.01" id="sync-actual-balance" class="form-input" placeholder="Misal: 150000" min="0" required autofocus autocomplete="off">
            </div>
          </div>
          <div id="sync-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem;background:linear-gradient(135deg, var(--amber), #d97706);box-shadow:0 4px 12px rgba(245,158,11,0.3)">Sync Balance</button>
        </form>
      </div>
    </div>
  `;

  const overlay = openModal(html);

  overlay.querySelector('#sync-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const wallet_id = document.getElementById('sync-wallet').value;
    const actual_balance = parseFloat(document.getElementById('sync-actual-balance').value);
    
    if (isNaN(actual_balance)) return showError('sync-err', 'Masukkan saldo yang valid');

    const originalText = btn.textContent;
    btn.textContent = 'Menyinkronkan...'; btn.disabled = true;
    try {
      await api(`/households/${state.householdId}/sync-balance`, 'POST', { wallet_id, actual_balance });
      closeModal();
      toast('Saldo berhasil disesuaikan!');
      await refreshAll();
      renderPage(state.activePage);
    } catch (err) {
      showError('sync-err', err.message);
      btn.textContent = originalText; btn.disabled = false;
    }
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: EMAIL SYNC
// ─────────────────────────────────────────────────────────────────────────────
async function pageEmailSync() {
  const body = document.getElementById('page-body');

  // Loading skeleton
  body.innerHTML = `
    <div class="panel" style="padding:2rem">
      <div style="text-align:center;padding:3rem;color:var(--text-3)">
        <i class="ph ph-spinner" style="font-size:2rem;animation:spin 1s linear infinite"></i>
        <p style="margin-top:1rem;font-weight:500">Mengecek koneksi Gmail…</p>
      </div>
    </div>`;

  // Check Gmail connection status
  let gmailStatus;
  try {
    gmailStatus = await api('/email-sync/status');
  } catch (e) {
    gmailStatus = { connected: false };
  }

  const isConnected = gmailStatus.connected;
  const gmailEmail  = gmailStatus.gmail_email || '';

  // Provider badges
  const providers = [
    { name: 'Mandiri', color: '#FFC107' },
    { name: 'BCA',     color: '#005CA9' },
    { name: 'BNI',     color: '#E65100' },
    { name: 'BRI',     color: '#1565C0' },
    { name: 'GoPay',   color: '#00AA13' },
    { name: 'OVO',     color: '#4C3494' },
    { name: 'DANA',    color: '#118EEA' },
    { name: 'Shopee',  color: '#EE4D2D' },
  ];

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.5rem;max-width:800px">

      <!-- Connection Panel -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="ph-fill ph-envelope-simple" style="margin-right:6px;color:var(--primary)"></i>Koneksi Gmail</span>
          ${isConnected ? `<span style="font-size:0.75rem;font-weight:700;background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:999px"><i class="ph-fill ph-check-circle"></i> Terhubung</span>` : `<span style="font-size:0.75rem;font-weight:700;background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:999px"><i class="ph-fill ph-x-circle"></i> Belum Terhubung</span>`}
        </div>
        <div class="panel-body">
          ${isConnected ? `
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem">
              <div style="width:44px;height:44px;border-radius:12px;background:var(--primary-subtle);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--primary)">
                <i class="ph-fill ph-envelope-open"></i>
              </div>
              <div>
                <div style="font-weight:700;color:var(--text-1)">${gmailEmail}</div>
                <div style="font-size:0.8rem;color:var(--text-3)">Gmail terhubung · Baca-saja (read-only)</div>
              </div>
            </div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
              <button id="btn-fetch-email" class="btn btn-primary">
                <i class="ph ph-arrows-clockwise"></i> Ambil Notifikasi Baru
              </button>
              <button id="btn-disconnect-gmail" class="btn btn-danger" style="background:transparent;color:var(--rose);border:1px solid var(--rose)">
                <i class="ph ph-plug-x"></i> Putus Koneksi
              </button>
            </div>
          ` : `
            <div style="margin-bottom:1.25rem">
              <p style="color:var(--text-2);line-height:1.7;margin-bottom:1rem">
                Hubungkan Gmail agar DompetKita bisa membaca notifikasi transaksi dari bank & e-wallet secara otomatis.
                App hanya akan membaca email, <strong>tidak bisa kirim atau hapus</strong>.
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.25rem">
                ${providers.map(p => `<span style="font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:6px;background:${p.color}22;color:${p.color};border:1px solid ${p.color}44">${p.name}</span>`).join('')}
                <span style="font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:6px;background:var(--surface-2);color:var(--text-3)">& lainnya</span>
              </div>
            </div>
            <button id="btn-connect-gmail" class="btn btn-primary" style="gap:0.5rem">
              <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="Google">
              Hubungkan dengan Gmail
            </button>
          `}
        </div>
      </div>

      <!-- Pending Notifications -->
      <div class="panel" id="pending-panel">
        <div class="panel-header">
          <span class="panel-title">Notifikasi Terdeteksi</span>
          <span id="pending-count" style="font-size:0.75rem;font-weight:700;background:var(--primary-subtle);color:var(--primary);padding:4px 10px;border-radius:999px">Memuat…</span>
        </div>
        <div class="panel-body" id="pending-body">
          <div style="text-align:center;padding:2rem;color:var(--text-3);font-weight:500">
            <i class="ph ph-envelope" style="font-size:2.5rem;opacity:0.4"></i>
            <p style="margin-top:0.75rem">${isConnected ? 'Klik "Ambil Notifikasi Baru" untuk mulai' : 'Hubungkan Gmail terlebih dahulu'}</p>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Riwayat Sinkronisasi</span>
        </div>
        <div class="panel-body" id="history-body" style="padding:0">
          <div style="text-align:center;padding:2rem;color:var(--text-3);font-weight:500">Belum ada riwayat</div>
        </div>
      </div>
    </div>
  `;

  // Load pending items
  if (isConnected) loadPendingItems();
  // Load history
  loadEmailHistory();

  // Event listeners
  document.getElementById('btn-connect-gmail')?.addEventListener('click', connectGmail);
  document.getElementById('btn-disconnect-gmail')?.addEventListener('click', disconnectGmail);
  document.getElementById('btn-fetch-email')?.addEventListener('click', fetchEmails);
}

async function connectGmail() {
  const btn = document.getElementById('btn-connect-gmail');
  if (btn) { btn.textContent = 'Mengarahkan…'; btn.disabled = true; }
  try {
    const r = await api('/email-sync/auth-init', 'POST');
    window.location.href = r.url;
  } catch (e) {
    toast('Gagal memulai koneksi Gmail: ' + e.message, 'error');
    if (btn) { btn.textContent = 'Hubungkan dengan Gmail'; btn.disabled = false; }
  }
}

async function disconnectGmail() {
  if (!confirm('Putus koneksi Gmail? Data riwayat tidak akan terhapus.')) return;
  try {
    await api('/email-sync/disconnect', 'DELETE');
    toast('Gmail berhasil diputus.');
    renderPage('email-sync');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function fetchEmails() {
  const btn = document.getElementById('btn-fetch-email');
  const pendingBody = document.getElementById('pending-body');
  if (btn) { btn.innerHTML = '<i class="ph ph-spinner"></i> Mengambil…'; btn.disabled = true; }
  pendingBody.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-3)"><i class="ph ph-spinner" style="font-size:2rem"></i><p style="margin-top:0.75rem">Membaca email & menganalisis dengan AI…</p></div>`;

  try {
    const r = await api('/email-sync/fetch', 'POST');
    if (r.data && r.data.length > 0) {
      toast(`${r.data.length} notifikasi baru ditemukan!`);
      loadPendingItems();
    } else {
      pendingBody.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-3);font-weight:500"><i class="ph ph-check-circle" style="font-size:2rem;color:var(--emerald)"></i><p style="margin-top:0.75rem">${r.message || 'Tidak ada notifikasi baru'}</p></div>`;
    }
  } catch (e) {
    toast('Gagal mengambil email: ' + e.message, 'error');
    pendingBody.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--rose)">${e.message}</div>`;
  } finally {
    if (btn) { btn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Ambil Notifikasi Baru'; btn.disabled = false; }
  }
}

async function loadPendingItems() {
  const pendingBody = document.getElementById('pending-body');
  const pendingCount = document.getElementById('pending-count');
  if (!pendingBody) return;

  try {
    const r = await api('/email-sync/pending');
    const items = r.data || [];

    if (pendingCount) pendingCount.textContent = `${items.length} menunggu`;

    if (items.length === 0) {
      pendingBody.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-3);font-weight:500">
        <i class="ph ph-check-circle" style="font-size:2.5rem;color:var(--emerald);opacity:0.7"></i>
        <p style="margin-top:0.75rem">Semua notifikasi sudah diproses!</p>
      </div>`;
      return;
    }

    const walletOptions = state.wallets.map(w => `<option value="${w.id}">${w.name} (Rp ${fmt(w.balance)})</option>`).join('');
    const catOptions = state.categories
      .filter(c => c.type === 'expense' || c.type === 'income')
      .map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    pendingBody.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0">
        ${items.map(item => {
          const isExpense = item.parsed_type === 'expense';
          const amtColor  = isExpense ? 'var(--rose)' : 'var(--emerald)';
          const amtSign   = isExpense ? '-' : '+';
          return `
          <div class="email-sync-item" data-id="${item.id}" style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:0.75rem">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:4px">
                  <span style="font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:6px;background:var(--primary-subtle);color:var(--primary)">${item.provider || 'Unknown'}</span>
                  <span style="font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:6px;background:${isExpense ? '#fef2f2' : '#f0fdf4'};color:${amtColor}">${isExpense ? 'Keluar' : 'Masuk'}</span>
                </div>
                <div style="font-weight:700;font-size:1rem;color:var(--text-1)">${item.parsed_merchant || 'Transaksi'}</div>
                <div style="font-size:0.8rem;color:var(--text-3);margin-top:2px">${item.raw_snippet || item.subject || ''}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:1rem">
                <div style="font-size:1.3rem;font-weight:800;color:${amtColor}">${amtSign}Rp ${fmt(item.parsed_amount)}</div>
                <div style="font-size:0.75rem;color:var(--text-3)">${item.parsed_date || ''}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
              <select class="form-select email-wallet-sel" data-id="${item.id}" style="font-size:0.85rem">
                <option value="">— Pilih Dompet —</option>
                ${walletOptions}
              </select>
              <select class="form-select email-cat-sel" data-id="${item.id}" style="font-size:0.85rem">
                <option value="">— Kategori (opsional) —</option>
                ${catOptions}
              </select>
            </div>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-primary btn-sm email-confirm-btn" data-id="${item.id}"
                data-amount="${item.parsed_amount}" data-type="${item.parsed_type}"
                data-merchant="${item.parsed_merchant || ''}"
                style="flex:1">
                <i class="ph-fill ph-check"></i> Konfirmasi
              </button>
              <button class="btn btn-ghost btn-sm email-skip-btn" data-id="${item.id}" style="color:var(--text-3)">
                <i class="ph ph-x"></i> Lewati
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>`;

    // Confirm buttons
    document.querySelectorAll('.email-confirm-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id     = btn.dataset.id;
        const item   = document.querySelector(`.email-sync-item[data-id="${id}"]`);
        const walSel = item.querySelector('.email-wallet-sel');
        const catSel = item.querySelector('.email-cat-sel');

        if (!walSel.value) { toast('Pilih dompet terlebih dahulu', 'error'); return; }

        btn.textContent = 'Menyimpan…'; btn.disabled = true;
        try {
          await api(`/households/${state.householdId}/email-sync/confirm/${id}`, 'POST', {
            wallet_id:   walSel.value,
            category_id: catSel.value || null,
            amount:      parseFloat(btn.dataset.amount),
            type:        btn.dataset.type,
            description: btn.dataset.merchant,
          });
          toast('Transaksi disimpan & saldo diperbarui!');
          await refreshAll();
          item.remove();
          const remaining = document.querySelectorAll('.email-sync-item').length;
          if (pendingCount) pendingCount.textContent = `${remaining} menunggu`;
          if (remaining === 0) loadPendingItems();
          loadEmailHistory();
        } catch (e) {
          toast(e.message, 'error');
          btn.innerHTML = '<i class="ph-fill ph-check"></i> Konfirmasi'; btn.disabled = false;
        }
      });
    });

    // Skip buttons
    document.querySelectorAll('.email-skip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id   = btn.dataset.id;
        const item = document.querySelector(`.email-sync-item[data-id="${id}"]`);
        try {
          await api(`/email-sync/skip/${id}`, 'POST');
          item.remove();
          const remaining = document.querySelectorAll('.email-sync-item').length;
          if (pendingCount) pendingCount.textContent = `${remaining} menunggu`;
          if (remaining === 0) loadPendingItems();
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    });

  } catch (e) {
    if (pendingBody) pendingBody.innerHTML = `<div style="padding:2rem;color:var(--rose)">${e.message}</div>`;
  }
}

async function loadEmailHistory() {
  const historyBody = document.getElementById('history-body');
  if (!historyBody) return;
  try {
    const r = await api('/email-sync/history');
    const items = r.data || [];
    if (items.length === 0) {
      historyBody.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-3);font-weight:500">Belum ada riwayat</div>`;
      return;
    }
    historyBody.innerHTML = items.map(item => {
      const isConfirmed = item.status === 'confirmed';
      const amtColor    = item.parsed_type === 'expense' ? 'var(--rose)' : 'var(--emerald)';
      const amtSign     = item.parsed_type === 'expense' ? '-' : '+';
      return `
      <div class="list-item" style="padding:1rem 1.5rem">
        <div class="list-icon" style="background:${isConfirmed ? '#dcfce7' : 'var(--surface-2)'};color:${isConfirmed ? 'var(--emerald)' : 'var(--text-3)'}">
          <i class="ph-fill ${isConfirmed ? 'ph-check-circle' : 'ph-x-circle'}"></i>
        </div>
        <div class="list-main">
          <div class="list-name">${item.parsed_merchant || 'Transaksi'}</div>
          <div class="list-sub">${item.provider || ''} · ${item.parsed_date || ''} · ${isConfirmed ? 'Dikonfirmasi' : 'Dilewati'}</div>
        </div>
        <div class="list-value" style="color:${amtColor}">${amtSign}Rp ${fmt(item.parsed_amount)}</div>
      </div>`;
    }).join('');
  } catch (e) {
    // silent fail on history
  }
}

// Handle Gmail OAuth callback redirect
(function handleGmailCallback() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('gmail_connected') === '1') {
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    // After app loads, navigate to email-sync
    const origRenderApp = window.renderApp;
    window.addEventListener('app:ready', () => {
      toast('Gmail berhasil terhubung!');
      renderPage('email-sync');
    });
  }
  if (params.get('gmail_error')) {
    window.history.replaceState({}, '', window.location.pathname);
    window.addEventListener('app:ready', () => {
      toast('Gagal menghubungkan Gmail: ' + params.get('gmail_error'), 'error');
    });
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('PWA Service Worker registered:', reg.scope);
    }).catch(err => {
      console.warn('PWA Service Worker failed to register:', err);
    });
  });
}
