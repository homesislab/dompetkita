(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function n(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(a){if(a.ep)return;a.ep=!0;const s=n(a);fetch(a.href,s)}})();const O=window.location.origin.includes(":5173")?"http://localhost:8003/api":"/api",l={token:localStorage.getItem("token")||null,user:JSON.parse(localStorage.getItem("user")||"null"),householdId:localStorage.getItem("householdId")||null,household:null,summary:null,categories:[],transactions:[],wallets:[],members:[],goals:[],budgets:[],billReminders:[],myRole:"member",activePage:"dashboard",theme:localStorage.getItem("theme")||"dark"};async function r(e,t="GET",n=null){const i={Accept:"application/json","Content-Type":"application/json"};l.token&&(i.Authorization=`Bearer ${l.token}`);const a=await fetch(`${O}${e}`,{method:t,headers:i,body:n?JSON.stringify(n):null}),s=await a.json();if(!a.ok)throw new Error(s.message||"Something went wrong");return s}const u=e=>new Intl.NumberFormat("id-ID").format(Number(e)||0),S=e=>new Date(e).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}),T=e=>{if(!e)return"??";const t=e.trim().split(/\s+/);return t.length===1?t[0].substring(0,2).toUpperCase():(t[0][0]+t[t.length-1][0]).toUpperCase()},M=e=>({bank:["#0ea5e9","💳"],cash:["#10b981","💵"],"e-wallet":["#f59e0b","📱"]})[e]||["#818cf8","💰"];function m(e,t="success"){const n=document.getElementById("toast-container");if(!n)return;const i=document.createElement("div");i.className=`toast toast-${t}`,i.innerHTML=`<span class="toast-icon">${t==="success"?"✓":"✕"}</span><span class="toast-msg">${e}</span>`,n.appendChild(i),setTimeout(()=>{i.classList.add("fade-out"),setTimeout(()=>i.remove(),300)},3e3)}function C(){localStorage.clear(),location.reload()}function W(e,t){l.token=e,l.user=t,localStorage.setItem("token",e),localStorage.setItem("user",JSON.stringify(t))}function $(e){var i;const t=document.getElementById("modal-root");t.innerHTML=e;const n=t.querySelector(".modal-overlay");return requestAnimationFrame(()=>n.classList.add("open")),n.addEventListener("click",a=>{a.target===n&&f()}),(i=n.querySelector(".modal-close"))==null||i.addEventListener("click",f),n}function f(){const e=document.querySelector(".modal-overlay");e&&(e.classList.remove("open"),setTimeout(()=>{document.getElementById("modal-root").innerHTML=""},300))}function G(){document.getElementById("app").innerHTML=`
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon" style="background:var(--primary);color:#fff;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.25rem">💰</div>
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
              <span class="input-icon">✉️</span>
              <input id="email" type="email" class="form-input" placeholder="yourname@email.com" required>
            </div>
          </div>
          <div class="form-field">
            <label>Password</label>
            <div class="input-wrap">
              <span class="input-icon">🔒</span>
              <input id="password" type="password" class="form-input" placeholder="••••••••" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:1rem">Sign In</button>
        </form>
        <div id="auth-err"></div>
      </div>
    </div>
    <div class="toast-container" id="toast-container"></div>
  `,document.getElementById("login-form").onsubmit=async e=>{e.preventDefault();const t=e.target.querySelector("button[type=submit]");t.textContent="Signing in…",t.disabled=!0;try{const n=await r("/login","POST",{email:document.getElementById("email").value,password:document.getElementById("password").value});W(n.data.access_token,n.data.user),R()}catch(n){document.getElementById("auth-err").innerHTML=`<div class="error-msg">${n.message}</div>`,t.textContent="Sign In",t.disabled=!1}}}async function R(){document.getElementById("app").innerHTML='<div class="spinner-wrap"><div class="spinner"></div><p style="color:var(--text-2);font-size:.875rem">Loading…</p></div>';try{if(!l.householdId){const e=await r("/households");e.data.length&&(l.householdId=e.data[0].id,l.household=e.data[0],localStorage.setItem("householdId",l.householdId))}await h()}catch(e){return console.error(e),C()}U()}async function h(){const e=l.householdId,[t,n,i,a,s,o,d,c]=await Promise.all([r(`/households/${e}/summary`),r(`/households/${e}/categories`),r(`/households/${e}/transactions`),r(`/households/${e}/wallets`),r(`/households/${e}/members`),r(`/households/${e}/goals`),r(`/households/${e}/budgets`),r(`/households/${e}/bill-reminders`)]);l.summary=t.data,l.categories=n.data,l.transactions=i.data,l.wallets=a.data,l.members=s.data.members||[],l.goals=o.data,l.budgets=d.data,l.billReminders=c.data,l.household=s.data.household||l.household;const v=l.members.find(g=>{var y;return g.id===((y=l.user)==null?void 0:y.id)});l.myRole=(v==null?void 0:v.role)||"member"}async function I(){const e=await r(`/households/${l.householdId}/goals`);l.goals=e.data}async function A(){const e=await r(`/households/${l.householdId}/members`);l.members=e.data.members||[];const t=l.members.find(n=>{var i;return n.id===((i=l.user)==null?void 0:i.id)});l.myRole=(t==null?void 0:t.role)||"member"}function U(){var e,t,n,i;document.body.setAttribute("data-theme",l.theme),(e=l.household)!=null&&e.name,document.getElementById("app").innerHTML=`
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon" style="background:var(--primary);color:#fff;width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem">💰</div>
          <div class="brand">DompetKita</div>
        </div>
        <span class="nav-label">Main</span>
        <button class="nav-item active" data-page="dashboard"><span class="nav-icon">🏠</span> Dashboard</button>
        <button class="nav-item" data-page="wallets"><span class="nav-icon">👛</span> Wallets</button>
        <button class="nav-item" data-page="transactions"><span class="nav-icon">📋</span> Ledger</button>
        <button class="nav-item" data-page="bill-reminders"><span class="nav-icon">📅</span> Bills</button>
        
        <span class="nav-label">Management</span>
        <button class="nav-item" data-page="categories"><span class="nav-icon">🏷️</span> Categories</button>
        <button class="nav-item" data-page="budgets"><span class="nav-icon">📊</span> Budgets</button>
        <button class="nav-item" data-page="goals"><span class="nav-icon">🎯</span> Goals</button>
        <button class="nav-item" data-page="members"><span class="nav-icon">👥</span> Family</button>
        
        <div class="sidebar-footer">
          <div class="theme-toggle-wrap">
            <button class="theme-btn ${l.theme==="light"?"active":""}" id="theme-light">☀️</button>
            <button class="theme-btn ${l.theme==="dark"?"active":""}" id="theme-dark">🌙</button>
          </div>
          <div class="user-chip">
            <div class="avatar">${T(((t=l.user)==null?void 0:t.name)||"")}</div>
            <div class="user-info">
              <div class="user-name">${((n=l.user)==null?void 0:n.name.split(" ")[0])||""}</div>
              <div class="user-email">Member</div>
            </div>
            <button class="logout-btn" id="logout-btn" title="Logout">⎋</button>
          </div>
        </div>
      </aside>
      <div class="main-content">
        <header class="topbar">
          <div class="topbar-title">
            <h2 id="page-title" style="font-size:1.4rem;font-weight:800;letter-spacing:-0.03em">Dashboard</h2>
            <p id="page-sub" style="color:var(--text-3);font-size:0.85rem;font-weight:500">Welcome back, <strong>${(i=l.user)==null?void 0:i.name.split(" ")[0]}</strong></p>
          </div>
          <div class="topbar-actions" id="topbar-actions"></div>
        </header>
        <div class="page-body" id="page-body"></div>
      </div>
    </div>
    <div id="modal-root"></div>
    <div class="toast-container" id="toast-container"></div>
  `,document.querySelectorAll(".nav-item[data-page]").forEach(a=>{a.addEventListener("click",()=>{document.querySelectorAll(".nav-item").forEach(s=>s.classList.remove("active")),a.classList.add("active"),l.activePage=a.dataset.page,b(a.dataset.page)})}),document.getElementById("logout-btn").addEventListener("click",C),document.getElementById("theme-light").onclick=()=>_("light"),document.getElementById("theme-dark").onclick=()=>_("dark"),b("dashboard")}function _(e){l.theme=e,localStorage.setItem("theme",e),document.body.setAttribute("data-theme",e),document.querySelectorAll(".theme-btn").forEach(t=>t.classList.remove("active")),document.getElementById(`theme-${e}`).classList.add("active")}function b(e){var d,c,v,g,y,E,x,p;const t=document.getElementById("page-body");if(!t)return;const n={dashboard:["Dashboard",`Overview of ${((d=l.household)==null?void 0:d.name)||""}`],wallets:["Wallets & Accounts",`${l.wallets.length} accounts · Manage & track balances`],transactions:["Transactions","Full ledger history"],categories:["Categories","Manage income & expense buckets"],members:["Family Members",`${l.members.length} members in ${((c=l.household)==null?void 0:c.name)||"your household"}`],goals:["Financial Goals","Track your family savings goals and progress"],budgets:["Painless Budgeting","Set limits for spending categories and stay on track"],"bill-reminders":["Bill Reminders","Track upcoming bills and never miss a payment"]},[i,a]=n[e]||["Dashboard",""];document.getElementById("page-title").textContent=i,document.getElementById("page-sub").innerHTML=a;const s=document.getElementById("topbar-actions");let o="";switch(e==="wallets"&&(o='<button class="btn btn-ghost" id="add-wallet-btn">＋ Add Wallet</button>'),e==="categories"&&(o='<button class="btn btn-ghost" id="add-cat-btn">＋ Add Category</button>'),e==="goals"&&(o='<button class="btn btn-ghost" id="add-goal-btn">＋ Add Goal</button>'),e==="budgets"&&(o='<button class="btn btn-ghost" id="add-budget-btn">＋ Set Budget</button>'),e==="bill-reminders"&&(o='<button class="btn btn-ghost" id="add-bill-btn">＋ Add Bill</button>'),e==="members"&&l.myRole==="admin"&&(o='<button class="btn btn-ghost" id="invite-btn">✉️ Invite Member</button>'),s.innerHTML=`${o}<button class="btn btn-primary" id="new-tx-btn">＋ New Transaction</button>`,document.getElementById("new-tx-btn").addEventListener("click",ee),(v=document.getElementById("add-wallet-btn"))==null||v.addEventListener("click",()=>k(null)),(g=document.getElementById("add-cat-btn"))==null||g.addEventListener("click",()=>B(null)),(y=document.getElementById("add-goal-btn"))==null||y.addEventListener("click",()=>P(null)),(E=document.getElementById("add-budget-btn"))==null||E.addEventListener("click",()=>z(null)),(x=document.getElementById("add-bill-btn"))==null||x.addEventListener("click",()=>H(null)),(p=document.getElementById("invite-btn"))==null||p.addEventListener("click",j),e){case"dashboard":t.innerHTML=F();break;case"wallets":t.innerHTML=K(),J();break;case"transactions":t.innerHTML=X(),Z();break;case"categories":t.innerHTML=V(),Q();break;case"members":t.innerHTML=ae(),ie();break;case"goals":t.innerHTML=se(),ne();break;case"budgets":t.innerHTML=oe(),de();break;case"bill-reminders":t.innerHTML=re(),ce();break}}function F(){var x;const{summary:e,transactions:t,wallets:n}=l,i=(e==null?void 0:e.total_balance)||0,a=(e==null?void 0:e.total_income)||0,s=(e==null?void 0:e.monthly_budget)||0,o=(e==null?void 0:e.monthly_expense)||0,d=s>0?Math.min(100,Math.round(o/s*100)):0,c=t.slice(0,5),v=(e==null?void 0:e.expenses_by_category)||[],g=(e==null?void 0:e.expenses_by_user)||[],y=new Date().getHours();return`
    <div style="margin-bottom: 2rem">
      <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-1)">${y<12?"Good morning":y<17?"Good afternoon":"Good evening"}, ${(x=l.user)==null?void 0:x.name.split(" ")[0]}! 👋</h3>
      <p style="color: var(--text-3); font-size: 0.95rem">Here's what's happening with your family finances.</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="card-icon">💰</div>
        <div class="card-label">Net Balance</div>
        <div class="card-value">Rp ${u(i)}</div>
        <div class="card-sub">${n.length} active wallets</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid var(--rose)">
        <div class="card-icon">📈</div>
        <div class="card-label">Expense this Month</div>
        <div class="card-value">Rp ${u(o)}</div>
        <div class="card-sub">${d}% of Rp ${u(s)} budget</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${d}%;background:${d>90?"var(--rose)":"var(--primary)"}"></div></div>
      </div>
      <div class="stat-card" style="border-left: 4px solid var(--emerald)">
        <div class="card-icon">📉</div>
        <div class="card-label">Monthly Income</div>
        <div class="card-value">Rp ${u(a)}</div>
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
            ${c.length===0?'<div style="padding:3rem;text-align:center;color:var(--text-3);font-weight:500">No transactions recorded yet</div>':`<div class="tx-list">${c.map(p=>N(p)).join("")}</div>`}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><span class="panel-title">Spending by Member</span></div>
          <div class="panel-body">
            ${g.length===0?'<p style="color:var(--text-3);text-align:center">No member data yet</p>':g.map(p=>`
              <div class="list-item">
                <div class="avatar" style="width:36px;height:36px;border-radius:10px">${T(p.user)}</div>
                <div class="list-main"><div class="list-name">${p.user}</div></div>
                <div class="list-value text-rose">Rp ${u(p.total)}</div>
              </div>`).join("")}
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:1.5rem">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Wallets & Accounts</span>
            <button class="btn btn-ghost btn-sm" onclick="document.querySelector('[data-page=wallets]').click()">Manage</button>
          </div>
          <div class="panel-body">
            ${n.slice(0,4).map(p=>`
              <div class="list-item">
                <div class="list-icon">${p.icon||"💳"}</div>
                <div class="list-main"><div class="list-name">${p.name}</div><div class="list-sub">${p.type}</div></div>
                <div class="list-value">Rp ${u(p.balance)}</div>
              </div>`).join("")}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><span class="panel-title">Top Expenses</span></div>
          <div class="panel-body">
            ${v.length===0?'<p style="color:var(--text-3);text-align:center">No data</p>':v.slice(0,4).map(p=>{const L=p.budget>0?Math.min(100,Math.round(p.total/p.budget*100)):0;return`
                <div style="margin-bottom:1.25rem">
                  <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem">
                    <span style="font-size:0.9rem;font-weight:700">${p.category}</span>
                    <span style="font-size:0.85rem;color:var(--text-2);font-weight:600">Rp ${u(p.total)}</span>
                  </div>
                  <div class="progress-bar" style="height:6px"><div class="progress-fill" style="width:${L||0}%;background:${L>90?"var(--rose)":"var(--primary)"}"></div></div>
                </div>`}).join("")}
          </div>
        </div>
      </div>
    </div>`}const Y=["💰","💳","🏦","📱","🏠","🛒","🍔","🚗","💡","✈️","🎮","🎁","🏥","🎓","🛠️","👗","💼","🍕","☕","🚆","🚲","🍿","📅","🐕","🌳","⚽","🎭","🎸"];function D(e="💰",t="selected-icon"){return`
    <div class="icon-picker">
      <div id="${t}" class="selected-icon-preview">${e}</div>
      <div class="icon-grid">
        ${Y.map(n=>`
          <div class="icon-option ${n===e?"selected":""}" onclick="selectIcon('${n}', '${t}')">${n}</div>
        `).join("")}
      </div>
      <input type="hidden" id="${t}-input" value="${e}">
    </div>
  `}window.selectIcon=(e,t)=>{document.getElementById(t).textContent=e,document.getElementById(`${t}-input`).value=e,document.querySelectorAll(".icon-option").forEach(n=>{n.classList.toggle("selected",n.textContent===e)})};function K(){const{wallets:e}=l;return`
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">My Wallets</span>
        <button class="btn btn-primary btn-sm" id="new-wallet-btn">＋ Add Wallet</button>
      </div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:1.5rem">
          ${e.map(t=>{const[n]=M(t.type);return`
            <div class="stat-card" style="border-bottom: 4px solid ${n}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem">
                <div class="list-icon" style="background:${n}1a;color:${n}">${t.icon||"💳"}</div>
                <div style="display:flex;gap:0.5rem">
                  <button class="btn btn-ghost btn-sm edit-wallet-btn" 
                    data-id="${t.id}" data-name="${t.name}" data-type="${t.type}" 
                    data-balance="${t.balance}" data-icon="${t.icon||"💰"}">✏️</button>
                  <button class="btn btn-danger btn-sm delete-wallet-btn" data-id="${t.id}" data-name="${t.name}">🗑️</button>
                </div>
              </div>
              <div class="card-label">${t.type.toUpperCase()}</div>
              <div class="card-value" style="font-size:1.5rem">Rp ${u(t.balance)}</div>
              <div class="card-sub" style="font-weight:700;color:var(--text-1);margin-top:0.5rem">${t.name}</div>
            </div>`}).join("")}
        </div>
      </div>
    </div>`}function J(){document.querySelectorAll(".edit-wallet-btn").forEach(e=>{e.onclick=()=>k({id:e.dataset.id,name:e.dataset.name,type:e.dataset.type,balance:e.dataset.balance,icon:e.dataset.icon})}),document.querySelectorAll(".delete-wallet-btn").forEach(e=>{e.onclick=()=>w(`Delete wallet "${e.dataset.name}"?`,async()=>{await r(`/households/${l.householdId}/wallets/${e.dataset.id}`,"DELETE"),m("Wallet deleted!"),await h(),b("wallets")})}),document.getElementById("new-wallet-btn")&&(document.getElementById("new-wallet-btn").onclick=()=>k())}function V(){const{categories:e}=l,t=e.filter(a=>a.type==="expense"),n=e.filter(a=>a.type==="income"),i=(a,s)=>`
    <div class="panel" style="flex:1">
      <div class="panel-header">
        <span class="panel-title">${a}</span>
        <button class="btn btn-ghost btn-sm new-cat-btn" data-type="${a.toLowerCase().includes("expense")?"expense":"income"}">＋ Add</button>
      </div>
      <div class="panel-body">
        ${s.length===0?'<p style="text-align:center;color:var(--text-3);padding:2rem">No categories</p>':s.map(o=>`
            <div class="list-item">
              <div class="list-icon" style="background:var(--surface-2)">${o.icon||"🏷️"}</div>
              <div class="list-main">
                <div class="list-name">${o.name}</div>
                <div class="list-sub">${o.budget>0?`Budget: Rp ${u(o.budget)}`:"No budget"}</div>
              </div>
              <div style="display:flex;gap:0.5rem">
                <button class="btn btn-ghost btn-sm edit-cat-btn" data-id="${o.id}" data-name="${o.name}" data-type="${o.type}" data-icon="${o.icon||"🏷️"}">✏️</button>
                <button class="btn btn-danger btn-sm delete-cat-btn" data-id="${o.id}" data-name="${o.name}">🗑️</button>
              </div>
            </div>`).join("")}
      </div>
    </div>`;return`<div style="display:flex;gap:2rem;flex-wrap:wrap">
    ${i("Expense Categories",t)}
    ${i("Income Categories",n)}
  </div>`}function Q(){document.querySelectorAll(".edit-cat-btn").forEach(e=>{e.onclick=()=>B({id:e.dataset.id,name:e.dataset.name,type:e.dataset.type,icon:e.dataset.icon})}),document.querySelectorAll(".delete-cat-btn").forEach(e=>{e.onclick=()=>w(`Delete category "${e.dataset.name}"?`,async()=>{await r(`/households/${l.householdId}/categories/${e.dataset.id}`,"DELETE"),m("Category deleted!"),await h(),b("categories")})}),document.querySelectorAll(".new-cat-btn").forEach(e=>{e.onclick=()=>B(null,e.dataset.type)})}function X(){const e=l.transactions;return`
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Ledger History</span>
        <span style="font-size:0.8rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:0.04em">${e.length} total</span>
      </div>
      <div class="panel-body" style="padding:0">
        ${e.length===0?'<div style="padding:5rem;text-align:center;color:var(--text-3);font-weight:500">No transactions recorded yet.</div>':`
          <div class="tx-list">${e.map(t=>N(t,!0)).join("")}</div>`}
      </div>
    </div>`}function Z(){document.querySelectorAll(".delete-tx-btn").forEach(e=>{e.onclick=()=>w(`Delete this ${e.dataset.type} of Rp ${u(e.dataset.amount||0)}?`,async()=>{await r(`/households/${l.householdId}/transactions/${e.dataset.id}`,"DELETE"),m("Transaction deleted!"),await h(),b("transactions")})})}function N(e,t=!1){var g,y,E,x,p;const n=e.type==="income",i=e.type==="transfer",a=i?"text-indigo":n?"text-emerald":"text-rose",s=i?"⇄":n?"+":"-",[o]=M(((g=e.wallet)==null?void 0:g.type)||"cash"),d=((y=e.category)==null?void 0:y.name)||(i?"Transfer":"Uncategorized"),c=((E=e.category)==null?void 0:E.icon)||(i?"🔄":"🏷️"),v=((x=e.user)==null?void 0:x.name)||"User";return`
    <div class="tx-item">
      <div class="tx-icon" style="background:${o}1a;color:${o};width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0">
        ${c}
      </div>
      <div class="tx-info">
        <div class="tx-title">${e.description||d}</div>
        <div class="tx-meta">
          <span class="pill pill-${e.type}">${e.type}</span>
          <span>${S(e.transaction_date)}</span>
          ${t?`<span style="opacity:0.5">•</span> <span>${((p=e.wallet)==null?void 0:p.name)||"Wallet"}</span>`:""}
        </div>
      </div>
      <div class="tx-amount-wrap">
        <div class="tx-amount ${a}">${s} Rp ${u(e.amount)}</div>
        <div class="tx-amount-meta">${v.split(" ")[0]} ${t&&e.to_wallet?"→ "+e.to_wallet.name:""}</div>
      </div>
      ${t?`
        <button class="btn btn-danger btn-sm delete-tx-btn" data-id="${e.id}" data-type="${e.type}" data-amount="${e.amount}" style="margin-left:1rem;padding:0.5rem;border-radius:10px">
          ✕
        </button>
      `:""}
    </div>`}function k(e=null){const t=!!e,n=$(`
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${t?"Edit Wallet":"Add Wallet"}</span>
          <button class="modal-close">✕</button>
        </div>
        <form id="wallet-form">
          <div class="form-field">
            <label>Wallet Name</label>
            <input id="w-name" type="text" class="form-input no-icon" placeholder="e.g. BCA Suami" value="${(e==null?void 0:e.name)||""}" required>
          </div>
          <div class="form-field">
            <label>Icon</label>
            ${D((e==null?void 0:e.icon)||"💰","w-picker")}
          </div>
          <div class="form-field">
            <label>Type</label>
            <select id="w-type" class="form-input">
              <option value="bank" ${(e==null?void 0:e.type)==="bank"?"selected":""}>🏦 Bank</option>
              <option value="cash" ${(e==null?void 0:e.type)==="cash"?"selected":""}>💵 Cash</option>
              <option value="e-wallet" ${(e==null?void 0:e.type)==="e-wallet"?"selected":""}>📱 E-Wallet</option>
            </select>
          </div>
          <div class="form-field">
            <label>${t?"Current Balance":"Opening Balance"}</label>
            <div class="input-wrap">
              <span class="input-icon" style="font-size:.8rem;color:var(--text-2)">Rp</span>
              <input id="w-balance" type="number" class="form-input" placeholder="0" value="${(e==null?void 0:e.balance)||0}" min="0">
            </div>
          </div>
          <div id="w-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">${t?"Update Wallet":"Create Wallet"}</button>
        </form>
      </div>
    </div>`);n.querySelector("#wallet-form").onsubmit=async i=>{i.preventDefault();const a=i.target.querySelector("button[type=submit]");a.textContent="Saving…",a.disabled=!0;const s={name:document.getElementById("w-name").value,type:document.getElementById("w-type").value,icon:document.getElementById("w-picker-input").value,balance:parseFloat(document.getElementById("w-balance").value)||0};try{t?(await r(`/households/${l.householdId}/wallets/${e.id}`,"PUT",s),m("Wallet updated!")):(await r(`/households/${l.householdId}/wallets`,"POST",s),m("Wallet created!")),f(),await h(),b("wallets")}catch(o){document.getElementById("w-err").innerHTML=`<div class="error-msg">${o.message}</div>`,a.textContent=t?"Update Wallet":"Create Wallet",a.disabled=!1}}}function B(e=null){const t=!!e,n=$(`
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${t?"Edit Category":"Add Category"}</span>
          <button class="modal-close">✕</button>
        </div>
        <form id="cat-form">
          <div class="form-field">
            <label>Category Name</label>
            <input id="c-name" type="text" class="form-input no-icon" placeholder="e.g. Makan Siang" value="${(e==null?void 0:e.name)||""}" required>
          </div>
          <div class="form-field">
            <label>Icon</label>
            ${D((e==null?void 0:e.icon)||"🏷️","c-picker")}
          </div>
          <div class="form-field">
            <label>Type</label>
            <select id="c-type" class="form-input">
              <option value="expense" ${(e==null?void 0:e.type)==="expense"?"selected":""}>📉 Expense</option>
              <option value="income" ${(e==null?void 0:e.type)==="income"?"selected":""}>📈 Income</option>
            </select>
          </div>
          <div id="c-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">${t?"Update Category":"Create Category"}</button>
        </form>
      </div>
    </div>`);n.querySelector("#cat-form").onsubmit=async i=>{i.preventDefault();const a=i.target.querySelector("button[type=submit]");a.textContent="Saving…",a.disabled=!0;const s={name:document.getElementById("c-name").value,type:document.getElementById("c-type").value,icon:document.getElementById("c-picker-input").value};try{t?(await r(`/households/${l.householdId}/categories/${e.id}`,"PUT",s),m("Category updated!")):(await r(`/households/${l.householdId}/categories`,"POST",s),m("Category created!")),f(),await h(),b("categories")}catch(o){document.getElementById("c-err").innerHTML=`<div class="error-msg">${o.message}</div>`,a.textContent=t?"Update Category":"Create Category",a.disabled=!1}}}function ee(){const e=l.wallets,t=l.categories;let n="expense";const i=$(`
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">New Transaction</span>
          <button class="modal-close">✕</button>
        </div>
        <div class="type-switcher">
          <button class="type-btn active-expense" data-type="expense">📉 Expense</button>
          <button class="type-btn" data-type="income">📈 Income</button>
          <button class="type-btn" data-type="transfer">🔄 Transfer</button>
        </div>
        <input type="hidden" id="tx-type" value="expense">
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
              <span class="input-icon">👛</span>
              <select id="tx-wallet" class="form-input">
                ${e.map(a=>`<option value="${a.id}">${a.name} · Rp ${u(a.balance)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-field" id="to-wallet-field" style="display:none">
            <label>To Wallet</label>
            <div class="input-wrap">
              <span class="input-icon">🎯</span>
              <select id="tx-to-wallet" class="form-input">
                ${e.map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-field" id="category-field">
            <label>Category</label>
            <div class="input-wrap">
              <span class="input-icon">🏷️</span>
              <select id="tx-category" class="form-input">
                <option value="">Select category</option>
                ${t.filter(a=>a.type==="expense").map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-field">
            <label>Description (optional)</label>
            <div class="input-wrap">
              <span class="input-icon">📝</span>
              <input type="text" id="tx-desc" class="form-input" placeholder="e.g. Weekly groceries">
            </div>
          </div>
          <div id="tx-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:1rem">Confirm Transaction</button>
        </form>
      </div>
    </div>`);i.querySelectorAll(".type-btn").forEach(a=>{a.addEventListener("click",()=>{n=a.dataset.type,i.querySelectorAll(".type-btn").forEach(d=>d.className="type-btn"),a.className=`type-btn active-${n}`,document.getElementById("tx-type").value=n;const s=n==="transfer";document.getElementById("to-wallet-field").style.display=s?"block":"none",document.getElementById("category-field").style.display=s?"none":"block",document.getElementById("label-wallet").textContent=s?"From Wallet":"Wallet";const o=document.getElementById("tx-category");o.innerHTML='<option value="">Select category</option>'+t.filter(d=>d.type===n).map(d=>`<option value="${d.id}">${d.name}</option>`).join("")})}),i.querySelector("#tx-form").onsubmit=async a=>{var v;a.preventDefault();const s=parseFloat(document.getElementById("tx-amount").value);if(!s||s<=0)return;const o=a.target.querySelector("button[type=submit]");o.textContent="Processing…",o.disabled=!0;const d=document.getElementById("tx-type").value,c={type:d,amount:s,wallet_id:document.getElementById("tx-wallet").value,to_wallet_id:d==="transfer"?document.getElementById("tx-to-wallet").value:null,category_id:((v=document.getElementById("tx-category"))==null?void 0:v.value)||null,description:document.getElementById("tx-desc").value,transaction_date:new Date().toISOString().split("T")[0]};try{await r(`/households/${l.householdId}/transactions`,"POST",c),f(),m("Transaction recorded!"),await h(),b(l.activePage)}catch(g){document.getElementById("tx-err").innerHTML=`<div class="error-msg">${g.message}</div>`,o.textContent="Confirm Transaction",o.disabled=!1}}}function w(e,t){const n=$(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:420px;text-align:center">
        <div class="modal-head" style="justify-content:center;margin-bottom:1rem">
          <span class="modal-title" style="color:var(--rose)">Confirm Delete</span>
          <button class="modal-close" style="position:absolute;right:2rem">✕</button>
        </div>
        <div style="font-size:2.5rem;margin-bottom:1rem">🗑️</div>
        <p style="color:var(--text-2);font-size:.9rem;line-height:1.6;margin-bottom:1.75rem">${e}</p>
        <div style="display:flex;gap:.75rem;justify-content:center">
          <button class="btn btn-ghost" id="cancel-del">Cancel</button>
          <button class="btn btn-danger" id="confirm-del">Yes, Delete</button>
        </div>
      </div>
    </div>`);n.querySelector("#cancel-del").onclick=f,n.querySelector("#confirm-del").onclick=async()=>{const i=n.querySelector("#confirm-del");i.textContent="Deleting…",i.disabled=!0;try{await t(),f()}catch(a){m(a.message,"error"),f()}}}const q=e=>e==="admin"?"var(--primary)":"var(--emerald)",te=e=>e==="admin"?"rgba(14,165,233,.12)":"rgba(16,185,129,.12)";function ae(){var a;const e=l.members,t=l.myRole==="admin",n=((a=l.household)==null?void 0:a.name)||"Household",i={};return l.transactions.forEach(s=>{var d;const o=((d=s.user)==null?void 0:d.name)||"Unknown";i[o]||(i[o]={count:0,expense:0,income:0}),i[o].count++,s.type==="expense"&&(i[o].expense+=Number(s.amount)),s.type==="income"&&(i[o].income+=Number(s.amount))}),`
    <!-- Household info card -->
    <div class="panel" style="display:flex;align-items:center;gap:1.5rem;padding:1.5rem;margin-bottom:1.5rem;background:var(--bg-2);border:none;box-shadow:var(--shadow-md)">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--grad-primary);display:flex;align-items:center;justify-content:center;font-size:1.75rem;flex-shrink:0">🏠</div>
      <div style="flex:1">
        <div style="font-size:1.1rem;font-weight:700">${n}</div>
        <div style="color:var(--text-2);font-size:.85rem;margin-top:.25rem">${e.length} member${e.length!==1?"s":""} · Your role: <span style="color:${q(l.myRole)};font-weight:600">${l.myRole}</span></div>
      </div>
      ${t?'<button class="btn btn-primary" id="invite-btn-inline"><span>✉️</span> Invite Member</button>':""}
    </div>

    <!-- Member cards grid -->
    <div class="members-grid">
      ${e.map(s=>{var c;const o=i[s.name]||{count:0,expense:0,income:0},d=s.id===((c=l.user)==null?void 0:c.id);return`
        <div class="member-card">
          <div class="member-card-top">
            <div class="member-avatar">${T(s.name)}</div>
            <div class="member-info">
              <div class="member-name">${s.name}${d?' <span class="pill pill-income" style="font-size:.65rem">You</span>':""}</div>
              <div class="member-email">${s.email}</div>
              <div style="margin-top:.5rem">
                <span class="member-role-badge" style="background:${te(s.role)};color:${q(s.role)}">
                  ${s.role==="admin"?"👑":"👤"} ${s.role}
                </span>
              </div>
            </div>
            ${t&&!d?`
              <button class="btn btn-danger btn-sm remove-member-btn" data-id="${s.id}" data-name="${s.name}" title="Remove member">✕</button>
            `:""}
          </div>
          <div class="member-stats">
            <div class="member-stat">
              <div class="member-stat-val">${o.count}</div>
              <div class="member-stat-label">Transactions</div>
            </div>
            <div class="member-stat">
              <div class="member-stat-val text-emerald">Rp ${u(o.income)}</div>
              <div class="member-stat-label">Income</div>
            </div>
            <div class="member-stat">
              <div class="member-stat-val text-rose">Rp ${u(o.expense)}</div>
              <div class="member-stat-label">Expense</div>
            </div>
          </div>
          <div class="member-card-footer">
            <span style="font-size:.75rem;color:var(--text-3)">Joined ${s.joined_at||"—"}</span>
          </div>
        </div>`}).join("")}
    </div>`}function se(){const e=l.goals;return`
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:1.5rem">
      ${e.length===0?`
        <div class="panel" style="grid-column: 1 / -1; padding: 4rem; text-align: center;">
          <div style="font-size: 3.5rem; margin-bottom: 1.5rem;">🎯</div>
          <h3 style="margin-bottom:0.5rem">No financial goals yet</h3>
          <p style="color: var(--text-3); margin-bottom: 2rem; font-weight:500">Start tracking your family savings and dreams today.</p>
          <button class="btn btn-primary" onclick="openGoalModal()">＋ Create Your First Goal</button>
        </div>
      `:e.map(t=>{var a,s;const n=Math.max(0,t.target_amount-t.current_amount),i=t.frequency&&t.frequency!=="none";return`
        <div class="goal-card">
          <div class="goal-header">
            <div class="goal-marker" style="background: ${color}"></div>
            <div class="goal-title-wrap">
              <div class="goal-name">${t.name}</div>
              <div class="goal-deadline">${t.deadline?"Due "+S(t.deadline):i?"🔄 "+t.frequency:"No deadline"}</div>
            </div>
            <div class="goal-actions" style="display: flex; gap: 0.25rem;">
              <button class="btn-icon add-item-btn" data-id="${t.id}" title="Add Task">＋</button>
              <button class="btn-icon edit-goal-btn" data-id="${t.id}" title="Edit">✏️</button>
              <button class="btn-icon delete-goal-btn" data-id="${t.id}" title="Delete">🗑️</button>
            </div>
          </div>
          <div class="goal-body">
            <div class="goal-progress-row">
              <div class="goal-progress-val">Rp ${u(t.current_amount)}</div>
              <div class="goal-progress-pct">${pct}%</div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${pct}%; background: ${color}"></div>
            </div>
            <div class="goal-footer">
              <div class="goal-target">Target: Rp ${u(t.target_amount)}</div>
              <div class="goal-remaining">${n>0?"Rp "+u(n)+" left":"Goal Reached! 🎉"}</div>
            </div>
            
            ${i?`
            <div class="goal-periodic-info" style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); font-size: 0.85rem; color: var(--text-2);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Periodic Target (${t.frequency})</span>
                <span style="font-weight: 600; color: var(--text-1);">Rp ${u(t.target_per_period||0)}</span>
              </div>
            </div>
            `:""}

            <!-- Checklist Section -->
            <div class="goal-items" style="margin-top: 1rem;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); font-weight: 700; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                Daily Checklist
                <span>${((a=t.items)==null?void 0:a.filter(o=>o.is_completed).length)||0}/${((s=t.items)==null?void 0:s.length)||0}</span>
              </div>
              <div class="goal-item-list" style="display: flex; flex-direction: column; gap: 0.4rem;">
                ${(t.items||[]).length===0?'<p style="font-size: 0.8rem; color: var(--text-3); font-style: italic;">No items yet.</p>':t.items.map(o=>`
                  <div class="goal-checklist-item" style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem;">
                    <input type="checkbox" class="toggle-item-chk" data-goal-id="${t.id}" data-item-id="${o.id}" ${o.is_completed?"checked":""} style="accent-color: ${color}">
                    <span style="flex: 1; ${o.is_completed?"text-decoration: line-through; color: var(--text-3);":"color: var(--text-2);"}">${o.title}</span>
                    <button class="btn-icon delete-item-btn" data-goal-id="${t.id}" data-item-id="${o.id}" style="font-size: 0.7rem; opacity: 0.5;">✕</button>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>`}).join("")}
    </div>`}function ne(){document.querySelectorAll(".edit-goal-btn").forEach(e=>{e.onclick=()=>{const t=l.goals.find(n=>n.id==e.dataset.id);P(t)}}),document.querySelectorAll(".delete-goal-btn").forEach(e=>{e.onclick=()=>{var t;return w(`Delete goal "<strong>${(t=l.goals.find(n=>n.id==e.dataset.id))==null?void 0:t.name}</strong>"?`,async()=>{await r(`/households/${l.householdId}/goals/${e.dataset.id}`,"DELETE"),m("Goal deleted"),await I(),b("goals")})}}),document.querySelectorAll(".toggle-item-chk").forEach(e=>{e.onchange=async()=>{const{goalId:t,itemId:n}=e.dataset;try{await r(`/households/${l.householdId}/goals/${t}/items/${n}/toggle`,"POST"),await I(),b("goals")}catch(i){m(i.message,"error"),e.checked=!e.checked}}}),document.querySelectorAll(".delete-item-btn").forEach(e=>{e.onclick=async()=>{const{goalId:t,itemId:n}=e.dataset;try{await r(`/households/${l.householdId}/goals/${t}/items/${n}`,"DELETE"),await I(),b("goals")}catch(i){m(i.message,"error")}}}),document.querySelectorAll(".add-item-btn").forEach(e=>{e.onclick=()=>le(e.dataset.id)})}function le(e){const t=$(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width: 320px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">＋ Add Checklist Item</span>
          <button class="modal-close">✕</button>
        </div>
        <form id="add-item-form">
          <div class="form-field">
            <label>Item Description</label>
            <input type="text" id="item-title" class="form-input no-icon" placeholder="e.g. Save 10k today" required autofocus>
          </div>
          <button type="submit" class="btn btn-primary btn-full">Add Item</button>
        </form>
      </div>
    </div>`);t.querySelector("#add-item-form").onsubmit=async n=>{n.preventDefault();const i=document.getElementById("item-title").value;try{await r(`/households/${l.householdId}/goals/${e}/items`,"POST",{title:i}),f(),await I(),b("goals")}catch(a){m(a.message,"error")}}}function P(e=null){const t=!!e,n=$(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width: 480px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${t?"✏️ Edit Goal":"🎯 New Savings Goal"}</span>
          <button class="modal-close">✕</button>
        </div>
        <form id="goal-form">
          <div class="form-field">
            <label>Goal Name</label>
            <input type="text" id="goal-name" class="form-input" placeholder="e.g. New Car, Vacation" value="${(e==null?void 0:e.name)||""}" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-field">
              <label>Target Total Amount</label>
              <input type="number" id="goal-target" class="form-input" placeholder="0" value="${(e==null?void 0:e.target_amount)||""}" required>
            </div>
            <div class="form-field">
              <label>Current Savings</label>
              <input type="number" id="goal-current" class="form-input" placeholder="0" value="${(e==null?void 0:e.current_amount)||0}">
            </div>
          </div>
          
          <div class="panel" style="margin: 0.5rem 0 1rem 0; background: var(--bg-2); border: 1px solid var(--border);">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-1); margin-bottom: 0.75rem;">Periodic Progress</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-field">
                <label>Frequency</label>
                <select id="goal-frequency" class="form-input">
                  <option value="none" ${(e==null?void 0:e.frequency)==="none"?"selected":""}>None (Single Target)</option>
                  <option value="daily" ${(e==null?void 0:e.frequency)==="daily"?"selected":""}>Daily</option>
                  <option value="weekly" ${(e==null?void 0:e.frequency)==="weekly"?"selected":""}>Weekly</option>
                  <option value="monthly" ${(e==null?void 0:e.frequency)==="monthly"?"selected":""}>Monthly</option>
                  <option value="yearly" ${(e==null?void 0:e.frequency)==="yearly"?"selected":""}>Yearly</option>
                </select>
              </div>
              <div class="form-field">
                <label>Periodic Target</label>
                <input type="number" id="goal-target-period" class="form-input" placeholder="e.g. 50000" value="${(e==null?void 0:e.target_per_period)||""}">
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-field">
              <label>Deadline (Optional)</label>
              <input type="date" id="goal-deadline" class="form-input" value="${(e==null?void 0:e.deadline)||""}">
            </div>
            <div class="form-field">
              <label>Color Tag</label>
              <input type="color" id="goal-color" class="form-input" value="${(e==null?void 0:e.color)||"#0ea5e9"}" style="padding: 2px; height: 42px;">
            </div>
          </div>
          <div id="goal-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top: 1rem;">
            ${t?"Update Goal":"Establish Goal"}
          </button>
        </form>
      </div>
    </div>`);n.querySelector("#goal-form").onsubmit=async i=>{i.preventDefault();const a=i.target.querySelector("button[type=submit]");a.textContent="Saving…",a.disabled=!0;const s={name:document.getElementById("goal-name").value,target_amount:document.getElementById("goal-target").value,current_amount:document.getElementById("goal-current").value,deadline:document.getElementById("goal-deadline").value||null,color:document.getElementById("goal-color").value,frequency:document.getElementById("goal-frequency").value,target_per_period:document.getElementById("goal-target-period").value||null};try{t?(await r(`/households/${l.householdId}/goals/${e.id}`,"PUT",s),m("Goal updated!")):(await r(`/households/${l.householdId}/goals`,"POST",s),m("Goal established! 🎯")),f(),await I(),b("goals")}catch(o){document.getElementById("goal-err").innerHTML=`<div class="error-msg">${o.message}</div>`,a.textContent=t?"Update Goal":"Establish Goal",a.disabled=!1}}}function ie(){var e;document.querySelectorAll(".remove-member-btn").forEach(t=>{t.addEventListener("click",()=>w(`Remove <strong>${t.dataset.name}</strong> from the household? They will lose access to all shared data.`,async()=>{await r(`/households/${l.householdId}/members/${t.dataset.id}`,"DELETE"),m(`${t.dataset.name} removed.`),await A(),b("members")}))}),(e=document.getElementById("invite-btn-inline"))==null||e.addEventListener("click",j)}function oe(){const e=l.budgets,t=l.categories.filter(a=>a.type==="expense"),n=l.summary,i=(n==null?void 0:n.expenses_by_category)||[];return`
    <div class="stats-grid">
      <div class="stat-card">
        <div class="card-icon">📊</div>
        <div class="card-label">Total Monthly Budget</div>
        <div class="card-value">Rp ${u(e.reduce((a,s)=>a+Number(s.amount),0))}</div>
        <div class="card-sub">Allocated across ${e.length} categories</div>
      </div>
      <div class="stat-card">
        <div class="card-icon">💸</div>
        <div class="card-label">Total Spent</div>
        <div class="card-value">Rp ${u(i.reduce((a,s)=>a+Number(s.total),0))}</div>
        <div class="card-sub">${n!=null&&n.monthly_expense?Math.round(n.monthly_expense/n.monthly_budget*100):0}% of global budget used</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Category Budgets</span></div>
      <div class="panel-body" style="padding:0">
        ${t.length===0?'<p style="padding:3rem;text-align:center;color:var(--text-3)">No expense categories</p>':t.map(a=>{const s=e.find(y=>y.category_id===a.id),o=i.find(y=>y.category_id===a.id)||{total:0},d=Number(o.total),c=s?Number(s.amount):0,v=c>0?Math.min(100,Math.round(d/c*100)):0,g=v>90?"var(--rose)":v>75?"var(--amber)":"var(--emerald)";return`
            <div class="list-item" style="padding:1.5rem;border-bottom:1px solid var(--border)">
              <div class="list-icon" style="background:var(--surface-2)">${a.icon||"🏷️"}</div>
              <div class="list-main">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
                  <div class="list-name">${a.name} <span class="pill" style="font-size:0.6rem;margin-left:0.5rem">${(s==null?void 0:s.period)||"Not set"}</span></div>
                  <div class="list-value" style="font-weight:800">${c>0?`Rp ${u(d)} / ${u(c)}`:'<span style="color:var(--text-3);font-weight:500">No budget</span>'}</div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${v}%;background:${g}"></div>
                </div>
              </div>
              <div style="margin-left:1.5rem">
                <button class="btn btn-ghost btn-sm edit-budget-btn" 
                  data-cat-id="${a.id}" data-cat-name="${a.name}" data-amount="${c}"
                  data-period="${(s==null?void 0:s.period)||"monthly"}" data-start="${(s==null?void 0:s.start_date)||""}" data-end="${(s==null?void 0:s.end_date)||""}">
                  ${c>0?"✏️":"＋ Set"}
                </button>
              </div>
            </div>`}).join("")}
      </div>
    </div>`}function de(){document.querySelectorAll(".edit-budget-btn").forEach(e=>{e.onclick=()=>z({category_id:e.dataset.catId,category_name:e.dataset.catName,amount:e.dataset.amount,period:e.dataset.period,start_date:e.dataset.start,end_date:e.dataset.end})})}function z(e=null){var i;const t=e&&Number(e.amount)>0,n=$(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:400px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${t?"Edit Budget":"Set Budget"}</span>
          <button class="modal-close">✕</button>
        </div>
        <div style="text-align:center;margin-bottom:1.5rem">
          <div style="font-size:3rem;margin-bottom:.5rem">📊</div>
          <p style="color:var(--text-2);font-size:.9rem">${e.category_name}</p>
        </div>
        <form id="budget-form">
          <div class="amount-field">
            <div class="amount-label">Limit Amount</div>
            <div class="amount-row">
              <span class="amount-currency">Rp</span>
              <input type="number" id="b-amount" class="amount-input" placeholder="0" value="${e.amount||""}" required autofocus>
            </div>
          </div>
          
          <div class="form-field">
            <label>Duration / Period</label>
            <select id="b-period" class="form-input">
              <option value="daily" ${e.period==="daily"?"selected":""}>📅 Daily</option>
              <option value="weekly" ${e.period==="weekly"?"selected":""}>📅 Weekly</option>
              <option value="monthly" ${e.period==="monthly"||!e.period?"selected":""}>📅 Monthly</option>
              <option value="yearly" ${e.period==="yearly"?"selected":""}>📅 Yearly</option>
              <option value="once" ${e.period==="once"?"selected":""}>🔔 One Time</option>
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div class="form-field" style="margin-bottom:0">
              <label>Start Date</label>
              <input type="date" id="b-start" class="form-input" value="${e.start_date||new Date().toISOString().split("T")[0]}" required>
            </div>
            <div class="form-field" style="margin-bottom:0">
              <label>End Date (Optional)</label>
              <input type="date" id="b-end" class="form-input" value="${e.end_date||""}">
            </div>
          </div>

          <div id="b-err"></div>
          <button type="submit" class="btn btn-primary btn-full">${t?"Update Budget":"Set Budget"}</button>
          ${t?'<button type="button" id="del-budget-btn" class="btn btn-danger btn-full" style="margin-top:.75rem">Remove Budget</button>':""}
        </form>
      </div>
    </div>`);n.querySelector("#budget-form").onsubmit=async a=>{a.preventDefault();const s=document.getElementById("b-amount").value,o=document.getElementById("b-period").value,d=document.getElementById("b-start").value,c=document.getElementById("b-end").value||null;try{await r(`/households/${l.householdId}/budgets`,"POST",{category_id:e.category_id,amount:s,period:o,start_date:d,end_date:c}),m("Budget saved!"),f(),await h(),b("budgets")}catch(v){document.getElementById("b-err").innerHTML=`<div class="error-msg">${v.message}</div>`}},(i=n.querySelector("#del-budget-btn"))==null||i.addEventListener("click",async()=>{const a=l.budgets.find(s=>s.category_id==e.category_id);if(a)try{await r(`/households/${l.householdId}/budgets/${a.id}`,"DELETE"),m("Budget removed"),f(),await h(),b("budgets")}catch(s){m(s.message,"error")}})}function j(){var t;const e=$(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:440px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">✉️ Invite Member</span>
          <button class="modal-close">✕</button>
        </div>
        <p style="color:var(--text-2);font-size:.875rem;margin-bottom:1.5rem;line-height:1.6">
          Invite someone to join <strong>${((t=l.household)==null?void 0:t.name)||"your household"}</strong>. They must already have a DompetKita account.
        </p>
        <form id="invite-form">
          <div class="form-field">
            <label>Email Address</label>
            <div class="input-wrap">
              <span class="input-icon">✉</span>
              <input id="inv-email" type="email" class="form-input" placeholder="member@email.com" required>
            </div>
          </div>
          <div class="form-field">
            <label>Role</label>
            <select id="inv-role" class="form-input">
              <option value="member">👤 Member – can view & add transactions</option>
              <option value="admin">👑 Admin – full access including inviting others</option>
            </select>
          </div>
          <div id="inv-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">Send Invite</button>
        </form>
      </div>
    </div>`);e.querySelector("#invite-form").onsubmit=async n=>{var a;n.preventDefault();const i=n.target.querySelector("button[type=submit]");i.textContent="Sending…",i.disabled=!0;try{const s=await r(`/households/${l.householdId}/invite`,"POST",{email:document.getElementById("inv-email").value,role:document.getElementById("inv-role").value});f(),m(`${((a=s.data)==null?void 0:a.name)||"User"} added to household!`),await A(),b("members")}catch(s){document.getElementById("inv-err").innerHTML=`<div class="error-msg">${s.message}</div>`,i.textContent="Send Invite",i.disabled=!1}}}function re(){const e=l.billReminders,t=e.filter(a=>!a.is_paid),n=e.filter(a=>a.is_paid),i=(a,s,o)=>`
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">${s}</span>
        ${o?'<button class="btn btn-primary btn-sm" onclick="openBillReminderModal()">＋ New Bill</button>':""}
      </div>
      <div class="panel-body" style="padding:0">
        ${a.length===0?'<p style="padding:3rem;text-align:center;color:var(--text-3)">No reminders.</p>':a.map(d=>{var c;return`
            <div class="list-item" style="padding:1.25rem;border-bottom:1px solid var(--border)">
              <div class="list-icon" style="background:var(--surface-2)">${((c=d.category)==null?void 0:c.icon)||"📅"}</div>
              <div class="list-main">
                <div class="list-name">${d.name}</div>
                <div class="list-sub">Due: ${S(d.due_date)} ${d.repeat_type!=="none"?"· 🔄 "+d.repeat_type:""}</div>
              </div>
              <div class="list-value" style="text-align:right">
                <div style="font-weight:800;color:var(--rose)">Rp ${u(d.amount)}</div>
                <div style="display:flex;gap:0.4rem;margin-top:0.6rem;justify-content:flex-end">
                  ${o?`<button class="btn btn-success btn-sm mark-paid-btn" data-id="${d.id}">Pay</button>`:""}
                  <button class="btn btn-ghost btn-sm edit-bill-btn" data-id="${d.id}">✏️</button>
                  <button class="btn btn-danger btn-sm delete-bill-btn" data-id="${d.id}">🗑️</button>
                </div>
              </div>
            </div>`}).join("")}
      </div>
    </div>`;return`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;flex-wrap:wrap">
      ${i(t,"🕒 Upcoming Bills",!0)}
      ${i(n,"✅ Recently Paid",!1)}
    </div>`}function ce(){document.querySelectorAll(".mark-paid-btn").forEach(e=>{e.onclick=()=>{const t=e.dataset.id,n=l.billReminders.find(i=>i.id==t);w(`Mark "${n.name}" as paid?`,async()=>{var i;try{await r(`/households/${l.householdId}/transactions`,"POST",{amount:n.amount,type:"expense",category_id:n.category_id,description:`Payment: ${n.name}`,transaction_date:new Date().toISOString().split("T")[0],wallet_id:(i=l.wallets[0])==null?void 0:i.id}),await r(`/households/${l.householdId}/bill-reminders/${t}`,"PUT",{...n,is_paid:!0}),m("Bill paid!"),await h(),b("bill-reminders")}catch(a){m(a.message,"error")}})}}),document.querySelectorAll(".edit-bill-btn").forEach(e=>{e.onclick=()=>H(l.billReminders.find(t=>t.id==e.dataset.id))}),document.querySelectorAll(".delete-bill-btn").forEach(e=>{e.onclick=()=>w("Delete this reminder?",async()=>{await r(`/households/${l.householdId}/bill-reminders/${e.dataset.id}`,"DELETE"),m("Reminder deleted!"),await h(),b("bill-reminders")})})}function H(e=null){const t=!!e,n=l.categories.filter(a=>a.type==="expense"),i=$(`
    <div class="modal-overlay">
      <div class="modal-sheet" style="max-width:440px">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <span class="modal-title">${t?"Edit Bill Reminder":"Add Bill Reminder"}</span>
          <button class="modal-close">✕</button>
        </div>
        <form id="bill-form">
          <div class="form-field">
            <label>Bill Name</label>
            <div class="input-wrap">
              <span class="input-icon">📅</span>
              <input id="b-name" type="text" class="form-input" placeholder="e.g. Electricity Bill" value="${(e==null?void 0:e.name)||""}" required>
            </div>
          </div>
          <div class="form-field">
            <label>Amount</label>
            <div class="input-wrap">
              <span class="input-icon">Rp</span>
              <input id="b-amount" type="number" class="form-input" placeholder="0" value="${(e==null?void 0:e.amount)||""}" required>
            </div>
          </div>
          <div class="form-field">
            <label>Due Date</label>
            <input id="b-date" type="date" class="form-input no-icon" value="${(e==null?void 0:e.due_date)||""}" required>
          </div>
          <div class="form-field">
            <label>Category</label>
            <div class="input-wrap">
              <span class="input-icon">🏷️</span>
              <select id="b-cat" class="form-input">
                <option value="">No Category</option>
                ${n.map(a=>`<option value="${a.id}" ${(e==null?void 0:e.category_id)==a.id?"selected":""}>${a.name}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-field">
            <label>Repeat Cycle</label>
            <div class="input-wrap">
              <span class="input-icon">🔄</span>
              <select id="b-repeat" class="form-input">
                <option value="none" ${(e==null?void 0:e.repeat_type)==="none"?"selected":""}>Does not repeat</option>
                <option value="monthly" ${(e==null?void 0:e.repeat_type)==="monthly"?"selected":""}>Monthly</option>
                <option value="yearly" ${(e==null?void 0:e.repeat_type)==="yearly"?"selected":""}>Yearly</option>
              </select>
            </div>
          </div>
          <div id="b-err"></div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem">${t?"Update Bill":"Save Reminder"}</button>
        </form>
      </div>
    </div>`);i.querySelector("#bill-form").onsubmit=async a=>{a.preventDefault();const s=a.target.querySelector("button[type=submit]");s.textContent="Saving…",s.disabled=!0;const o={name:document.getElementById("b-name").value,amount:document.getElementById("b-amount").value,due_date:document.getElementById("b-date").value,category_id:document.getElementById("b-cat").value||null,repeat_type:document.getElementById("b-repeat").value};try{t?await r(`/households/${l.householdId}/bill-reminders/${e.id}`,"PUT",o):await r(`/households/${l.householdId}/bill-reminders`,"POST",o),m(t?"Bill updated!":"Reminder saved!"),f(),await h(),b("bill-reminders")}catch(d){document.getElementById("b-err").innerHTML=`<div class="error-msg">${d.message}</div>`,s.textContent=t?"Update Bill":"Save Reminder",s.disabled=!1}}}l.token?R():G();
