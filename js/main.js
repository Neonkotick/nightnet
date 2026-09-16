/**
 * NIGHTNET — Main Application Bootstrap
 */
import { CATEGORIES, SERVICES, filterServices, getServiceById } from './data/services.js';
import {
  getState, subscribe, spendCredits, addCredits, setDistrict,
  pushNotification, setActiveEvent, clearActiveEvent, resetDemo, toggleFavorite
} from './state/store.js';

// ─── Helpers ───────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function formatCredits(n) {
  return '€$ ' + Math.floor(n).toLocaleString('en-US');
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function log(msg) {
  const logEl = $('#sys-log');
  if (!logEl) return;
  const line = document.createElement('div');
  line.textContent = `> ${msg}`;
  logEl.prepend(line);
  while (logEl.children.length > 12) logEl.lastChild.remove();
}

// ─── Views ─────────────────────────────────────────────────
function switchView(name) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  const view = $(`#view-${name}`);
  if (view) view.classList.add('active');
  if (name === 'profile') renderProfile();
  if (name === 'wallet') renderWallet();
  if (name === 'events') renderEvents();
  if (name === 'news') renderNews();
  if (name === 'map') renderMap();
}

$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ─── Catalog ───────────────────────────────────────────────
let currentCategory = 'all';
let currentSort = 'popularity';
let currentSearch = '';

function renderCategoryChips() {
  const container = $('#category-filters');
  container.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${cat.id === currentCategory ? ' active' : ''}`;
    chip.textContent = cat.label;
    chip.dataset.cat = cat.id;
    chip.addEventListener('click', () => {
      currentCategory = cat.id;
      renderCategoryChips();
      renderCatalog();
    });
    container.appendChild(chip);
  });
}

function renderCatalog() {
  const list = filterServices({
    category: currentCategory,
    search: currentSearch,
    sort: currentSort,
  });
  const grid = $('#service-grid');
  const empty = $('#empty-catalog');
  $('#service-count').textContent = `${list.length} ONLINE`;

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  grid.innerHTML = list.map(s => `
    <article class="service-card" role="listitem" tabindex="0" data-id="${s.id}"
      style="--card-accent: ${s.color}"
      aria-label="${s.name}, ${formatCredits(s.price)}">
      <div class="status-badge" style="color:${s.color}">${s.status}</div>
      <div class="name">${s.name}</div>
      <div class="short">${s.short}</div>
      <div class="meta">
        <span class="price">${formatCredits(s.price)}</span>
        <span>${s.responseTime}</span>
        <span class="risk-${s.risk}">${s.risk}</span>
        <span>★ ${s.rating}</span>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', () => openServiceModal(card.dataset.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openServiceModal(card.dataset.id);
      }
    });
  });
}

$('#search-input').addEventListener('input', e => {
  currentSearch = e.target.value;
  renderCatalog();
});

$('#sort-select').addEventListener('change', e => {
  currentSort = e.target.value;
  renderCatalog();
});

// ─── Service Modal & Order Flow ────────────────────────────
let currentService = null;
let modalStep = 'detail'; // detail | confirm | accepted

function openServiceModal(id) {
  const s = getServiceById(id);
  if (!s) return;
  currentService = s;
  modalStep = 'detail';
  renderModal();
  const backdrop = $('#modal-backdrop');
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add('open'));
  $('#service-modal').classList.add('glitch');
  setTimeout(() => $('#service-modal').classList.remove('glitch'), 400);
  log(`OPENED SERVICE NODE: ${s.name}`);
}

function closeModal() {
  const backdrop = $('#modal-backdrop');
  backdrop.classList.remove('open');
  setTimeout(() => { backdrop.hidden = true; currentService = null; }, 220);
}

function renderModal() {
  if (!currentService) return;
  const s = currentService;
  $('#modal-title').textContent = s.name;
  $('#modal-status').textContent = `STATUS: ${s.status}`;

  const body = $('#modal-body');
  if (modalStep === 'detail') {
    body.innerHTML = `
      <p style="font-size:0.85rem;color:var(--text-dim);margin-bottom:1rem;">${s.description}</p>
      <div class="row"><span>PRICE</span><span>${formatCredits(s.price)}</span></div>
      <div class="row"><span>RESPONSE TIME</span><span>${s.responseTime}</span></div>
      <div class="row"><span>RISK LEVEL</span><span class="risk-${s.risk}">${s.risk}</span></div>
      <div class="row"><span>RATING</span><span>★ ${s.rating} (${s.orders} orders)</span></div>
      <div class="row"><span>AVAILABILITY</span><span>${s.available ? '24/7' : 'OFFLINE'}</span></div>
      <div style="margin-top:0.9rem;font-size:0.75rem;color:var(--text-muted);">
        <strong style="color:var(--text-dim);">OPTIONS:</strong><br/>
        ${s.options.map(o => `• ${o}`).join('<br/>')}
      </div>
      <div class="modal-actions">
        <button class="btn" id="btn-request" type="button" ${!s.available ? 'disabled' : ''}>REQUEST SERVICE</button>
        <button class="btn btn-ghost" id="btn-fav" type="button">★ FAVORITE</button>
        <button class="btn btn-ghost" type="button" data-close>CANCEL</button>
      </div>
    `;
    $('#btn-request')?.addEventListener('click', () => {
      modalStep = 'confirm';
      renderModal();
    });
    $('#btn-fav')?.addEventListener('click', () => {
      toggleFavorite(s.id);
      toast(getState().user.favorites.includes(s.id) ? 'ADDED TO FAVORITES' : 'REMOVED FROM FAVORITES');
    });
  } else if (modalStep === 'confirm') {
    const state = getState();
    body.innerHTML = `
      <div style="font-size:0.8rem;letter-spacing:0.08em;color:var(--neon-yellow);margin-bottom:0.75rem;">REQUEST CONFIRMATION</div>
      <div class="row"><span>SERVICE</span><span>${s.name}</span></div>
      <div class="row"><span>LOCATION</span><span>NIGHT CITY / ${state.user.district}</span></div>
      <div class="row"><span>ESTIMATED COST</span><span>${formatCredits(s.price)}</span></div>
      <div class="row"><span>RESPONSE TIME</span><span>${s.responseTime}</span></div>
      <div class="row"><span>YOUR BALANCE</span><span>${formatCredits(state.user.credits)}</span></div>
      <div class="modal-actions">
        <button class="btn" id="btn-confirm" type="button">CONFIRM</button>
        <button class="btn btn-ghost" type="button" data-close>CANCEL</button>
      </div>
    `;
    $('#btn-confirm')?.addEventListener('click', () => {
      if (s.price > 0) {
        const res = spendCredits(s.price, s.name);
        if (!res.ok) {
          body.innerHTML = `
            <div class="system-error">
              SYSTEM ERROR // 0x73A<br/><br/>
              REQUEST FAILED<br/>
              INSUFFICIENT CREDITS.<br/><br/>
              REQUIRED: ${formatCredits(s.price)}<br/>
              AVAILABLE: ${formatCredits(getState().user.credits)}
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" data-close>CLOSE</button>
            </div>
          `;
          toast('INSUFFICIENT FUNDS', 'error');
          log('REQUEST FAILED: INSUFFICIENT CREDITS');
          return;
        }
      }
      modalStep = 'accepted';
      renderModal();
      toast(`REQUEST ACCEPTED — ${s.name}`, 'success');
      log(`DISPATCHED: ${s.name}`);
      pushNotification(`Service ${s.name} dispatched to ${getState().user.district}`, 'success');
    });
  } else if (modalStep === 'accepted') {
    const etaMin = Math.floor(Math.random() * 8) + 2;
    const etaSec = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    const operators = ['ALPHA-7', 'BETA-3', 'GHOST-9', 'VULTURE-2', 'PHANTOM-1', 'RAZOR-5'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    body.innerHTML = `
      <div style="font-size:0.9rem;color:var(--neon-green);letter-spacing:0.1em;margin-bottom:1rem;">REQUEST ACCEPTED</div>
      <div class="row"><span>OPERATOR</span><span>${op}</span></div>
      <div class="row"><span>STATUS</span><span style="color:var(--neon-green)">DISPATCHED</span></div>
      <div class="row"><span>ETA</span><span>0${etaMin}:${etaSec}</span></div>
      <div class="row"><span>TRACKING</span><span>NC-${Math.random().toString(36).slice(2, 8).toUpperCase()}</span></div>
      <p style="margin-top:1rem;font-size:0.75rem;color:var(--text-muted);">
        Stay on this channel. Operator will contact via encrypted link.
      </p>
      <div class="modal-actions">
        <button class="btn" type="button" data-close>CLOSE CHANNEL</button>
      </div>
    `;
  }

  body.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
}

$('#modal-close').addEventListener('click', closeModal);
$('#modal-backdrop').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal-backdrop').hidden) closeModal();
});

// ─── Wallet / Profile ──────────────────────────────────────
function updateWalletUI() {
  const credits = getState().user.credits;
  $('#wallet-display').textContent = formatCredits(credits);
  const big = $('#wallet-big');
  if (big) big.textContent = formatCredits(credits);
}

function renderWallet() {
  updateWalletUI();
  const list = $('#tx-list');
  const txs = getState().transactions;
  if (!txs.length) {
    list.innerHTML = '<p class="empty-state">NO TRANSACTIONS</p>';
    return;
  }
  list.innerHTML = txs.slice(0, 20).map(tx => `
    <div class="tx-item">
      <span style="color:${tx.amount >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'}">
        ${tx.amount >= 0 ? '+' : ''}${formatCredits(tx.amount)}
      </span>
      <span style="float:right;color:var(--text-muted)">${tx.label}</span>
    </div>
  `).join('');
}

$('#btn-claim')?.addEventListener('click', () => {
  addCredits(5000, 'TEST CREDIT INJECTION');
  toast('+€$ 5,000 CREDITED', 'success');
  log('CREDIT INJECTION: +5000');
  renderWallet();
});

$('#btn-reset')?.addEventListener('click', () => {
  if (confirm('RESET DEMO STATE? This will restore default balance and history.')) {
    resetDemo();
    toast('DEMO STATE RESET', 'info');
    log('SYSTEM RESET');
    renderWallet();
    updateWalletUI();
    renderProfile();
  }
});

function renderProfile() {
  const u = getState().user;
  $('#profile-body').innerHTML = `
    <dl class="profile-grid">
      <dt>USER ID</dt><dd>${u.id}</dd>
      <dt>STATUS</dt><dd style="color:var(--neon-green)">${u.status}</dd>
      <dt>REPUTATION</dt><dd>${u.reputation}</dd>
      <dt>CREDITS</dt><dd>${formatCredits(u.credits)}</dd>
      <dt>COMPLETED</dt><dd>${u.completedContracts}</dd>
      <dt>DISTRICT</dt><dd>${u.district}</dd>
      <dt>JOINED</dt><dd>${u.joinDate}</dd>
      <dt>FAVORITES</dt><dd>${u.favorites.length}</dd>
    </dl>
    <p style="margin-top:1rem;font-size:0.7rem;color:var(--text-muted);">
      Profile data is stored locally. No real personal information is collected.
    </p>
  `;
  $('#current-district').textContent = u.district;
}

// ─── Map ───────────────────────────────────────────────────
const DISTRICTS = [
  { id: 'WATSON', heat: 'HIGH', note: 'Gang activity frequent. Trauma response demand elevated.' },
  { id: 'DOWNTOWN', heat: 'MEDIUM', note: 'Corporate security heavy. Netrunner presence high.' },
  { id: 'INDUSTRIAL', heat: 'MEDIUM', note: 'Smuggling routes active. Vehicle recovery common.' },
  { id: 'OLD CITY', heat: 'HIGH', note: 'Unstable infrastructure. Black market hubs.' },
  { id: 'BADLANDS', heat: 'CRITICAL', note: 'Outside primary coverage. Surcharges apply.' },
  { id: 'CORPORATE', heat: 'LOW', note: 'Heavy surveillance. Official channels preferred.' },
  { id: 'PORT', heat: 'MEDIUM', note: 'Cargo movement. Smuggling and air transport hotspots.' },
  { id: 'RED SECTOR', heat: 'CRITICAL', note: 'No-go for most operators. Extreme risk.' },
];

function renderMap() {
  const map = $('#district-map');
  const current = getState().user.district;
  map.innerHTML = DISTRICTS.map(d => `
    <button type="button" class="district${d.id === current ? ' active' : ''}" data-id="${d.id}" role="option" aria-selected="${d.id === current}">
      ${d.id}<br/><span style="font-size:0.6rem;opacity:0.7">${d.heat}</span>
    </button>
  `).join('');
  map.querySelectorAll('.district').forEach(btn => {
    btn.addEventListener('click', () => {
      setDistrict(btn.dataset.id);
      renderMap();
      updateDistrictInfo(btn.dataset.id);
      toast(`LOCATION SET: ${btn.dataset.id}`);
      log(`DISTRICT LOCKED: ${btn.dataset.id}`);
    });
  });
  updateDistrictInfo(current);
}

function updateDistrictInfo(id) {
  const d = DISTRICTS.find(x => x.id === id);
  $('#district-info').innerHTML = d
    ? `<strong style="color:var(--neon-cyan)">${d.id}</strong> — HEAT: ${d.heat}<br/>${d.note}`
    : '';
  $('#current-district').textContent = id;
}

// ─── Events ────────────────────────────────────────────────
const EVENT_TEMPLATES = [
  { title: 'GANG ACTIVITY DETECTED', threat: 'HIGH', actions: ['REQUEST NCPD', 'HIRE MERC', 'IGNORE'] },
  { title: 'CYBERWARE MALFUNCTION', threat: 'MEDIUM', actions: ['REQUEST RIPPERDOC', 'IGNORE'] },
  { title: 'CORPORATE LOCKDOWN', threat: 'HIGH', actions: ['REQUEST EXTRACTION', 'WAIT'] },
  { title: 'VEHICLE THEFT REPORT', threat: 'MEDIUM', actions: ['VEHICLE RECOVERY', 'IGNORE'] },
  { title: 'NETRUNNER ATTACK', threat: 'CRITICAL', actions: ['COUNTER-HACK', 'HIRE NETRUNNER'] },
  { title: 'MISSING PERSON ALERT', threat: 'MEDIUM', actions: ['INVESTIGATION', 'IGNORE'] },
  { title: 'SUSPICIOUS PACKAGE', threat: 'HIGH', actions: ['REQUEST NCPD', 'EVACUATE'] },
  { title: 'DATA LEAK DETECTED', threat: 'HIGH', actions: ['DATA RECOVERY', 'COUNTER-HACK'] },
  { title: 'FIXER CONTRACT AVAILABLE', threat: 'LOW', actions: ['ACCEPT', 'DECLINE'] },
  { title: 'EMERGENCY MEDICAL REQUEST', threat: 'HIGH', actions: ['TRAUMA RESPONSE', 'IGNORE'] },
];

function spawnEvent() {
  const t = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)].id;
  const event = {
    id: `ev-${Date.now()}`,
    ...t,
    district,
    ts: Date.now(),
  };
  setActiveEvent(event);
  renderAsideAlerts();
  log(`ALERT: ${event.title} @ ${event.district}`);
  return event;
}

function renderEvents() {
  const container = $('#events-container');
  const active = getState().activeEvent;
  let html = '';
  if (active) {
    html += `
      <div class="event-alert">
        <div class="title">⚠ ${active.title}</div>
        <div style="font-size:0.75rem;margin:0.4rem 0;">DISTRICT: ${active.district} · THREAT: ${active.threat}</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.6rem;">
          ${active.actions.map(a => `<button class="btn" data-action="${a}" type="button">${a}</button>`).join('')}
        </div>
      </div>
    `;
  }
  html += `<button class="btn" id="btn-scan" type="button" style="margin-top:0.5rem;">SCAN NETWORK FOR NEW EVENTS</button>`;
  container.innerHTML = html;

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      toast(`RESPONSE: ${btn.dataset.action}`, 'info');
      log(`EVENT RESPONSE: ${btn.dataset.action}`);
      clearActiveEvent();
      renderEvents();
      renderAsideAlerts();
    });
  });
  $('#btn-scan')?.addEventListener('click', () => {
    spawnEvent();
    renderEvents();
    toast('NEW CITY EVENT DETECTED', 'info');
  });
}

function renderAsideAlerts() {
  const el = $('#aside-alerts');
  const active = getState().activeEvent;
  if (!active) {
    el.innerHTML = '<p style="font-size:0.7rem;color:var(--text-muted);">NO CRITICAL ALERTS</p>';
    return;
  }
  el.innerHTML = `
    <div class="event-item">
      <strong style="color:var(--neon-red)">${active.title}</strong><br/>
      <span style="font-size:0.65rem;">${active.district} · ${active.threat}</span>
    </div>
  `;
}

// ─── News ──────────────────────────────────────────────────
const NEWS = [
  { t: 'ARASAKA STOCKS RISE AFTER NEW SECURITY CONTRACT', ago: '12 MIN' },
  { t: 'THREE VEHICLES REPORTED STOLEN IN WATSON', ago: '28 MIN' },
  { t: 'NETRUNNER ACTIVITY INCREASES ACROSS DOWNTOWN', ago: '41 MIN' },
  { t: 'TRAUMA RESPONSE SERVICES REPORT RECORD NIGHT', ago: '1 H' },
  { t: 'CORPORATE LOCKDOWN LIFTED IN CORPORATE DISTRICT', ago: '2 H' },
  { t: 'BLACK MARKET RAID IN OLD CITY — CASUALTIES UNKNOWN', ago: '3 H' },
  { t: 'NEW CYBERWARE REGULATIONS PROPOSED BY CITY COUNCIL', ago: '5 H' },
  { t: 'FIXER NETWORK EXPANSION REPORTED IN PORT DISTRICT', ago: '7 H' },
];

function renderNews() {
  $('#news-list').innerHTML = NEWS.map(n => `
    <div class="news-item">
      <time>${n.ago} AGO</time>
      ${n.t}
    </div>
  `).join('');
}

// ─── State subscription ────────────────────────────────────
subscribe(() => {
  updateWalletUI();
  $('#current-district').textContent = getState().user.district;
});

// ─── Easter eggs ───────────────────────────────────────────
const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIdx = 0;
document.addEventListener('keydown', e => {
  if (e.key === konami[konamiIdx]) {
    konamiIdx++;
    if (konamiIdx === konami.length) {
      konamiIdx = 0;
      openSecretTerminal();
    }
  } else {
    konamiIdx = 0;
  }
});

function openSecretTerminal() {
  const term = $('#secret-terminal');
  term.classList.add('open');
  term.setAttribute('aria-hidden', 'false');
  $('#secret-output').textContent = `
NIGHTNET SECRET NODE // ACCESS GRANTED

TYPE 'help' FOR COMMANDS
TYPE 'exit' TO CLOSE

`;
  $('#secret-input').focus();
  toast('SECRET NODE UNLOCKED', 'success');
  log('EASTER EGG: SECRET TERMINAL');
}

$('#secret-input')?.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const cmd = e.target.value.trim().toLowerCase();
  e.target.value = '';
  const out = $('#secret-output');
  out.textContent += `> ${cmd}\n`;
  if (cmd === 'exit' || cmd === 'quit') {
    $('#secret-terminal').classList.remove('open');
    return;
  }
  if (cmd === 'help') {
    out.textContent += 'COMMANDS: help, credits, status, jack_in, exit\n';
  } else if (cmd === 'credits') {
    addCredits(7777, 'SECRET NODE BONUS');
    out.textContent += '+€$ 7,777 CREDITED\n';
    toast('+€$ 7,777 FROM SECRET NODE', 'success');
  } else if (cmd === 'status') {
    out.textContent += `USER ${getState().user.id} // REP ${getState().user.reputation} // ${formatCredits(getState().user.credits)}\n`;
  } else if (cmd === 'jack_in') {
    out.textContent += 'NEURAL LINK ESTABLISHED... WELCOME TO THE NET, CHOOM.\n';
  } else {
    out.textContent += 'UNKNOWN COMMAND\n';
  }
  out.scrollTop = out.scrollHeight;
});

// ─── Boot ──────────────────────────────────────────────────
function boot() {
  renderCategoryChips();
  renderCatalog();
  updateWalletUI();
  renderProfile();
  renderNews();
  renderAsideAlerts();
  // spawn a random event after a short delay
  setTimeout(() => {
    if (!getState().activeEvent) spawnEvent();
  }, 8000);
  log('NIGHTNET READY');
  console.log('%cNIGHTNET // ONLINE', 'color:#00f0ff;font-family:monospace;font-size:14px');
  console.log('Try the Konami code or window.__NIGHTNET__');
}

boot();
