/**
 * NIGHTNET Global State
 * Wallet, user profile, transactions, notifications, city events
 * Persisted to localStorage
 */

const STORAGE_KEY = 'nightnet_v1';

const defaultState = {
  user: {
    id: 'NC-7F92A1',
    status: 'ACTIVE',
    reputation: 72,
    credits: 15750,
    completedContracts: 18,
    district: 'WATSON',
    favorites: [],
    joinDate: '2026-03-14',
  },
  transactions: [
    { id: 'tx-001', amount: 5000, type: 'credit', label: 'CONTRACT PAYMENT', ts: Date.now() - 86400000 * 3 },
    { id: 'tx-002', amount: -2500, type: 'debit', label: 'TRAUMA RESPONSE', ts: Date.now() - 86400000 * 2 },
    { id: 'tx-003', amount: -800, type: 'debit', label: 'VEHICLE RECOVERY', ts: Date.now() - 86400000 },
  ],
  notifications: [],
  activeEvent: null,
  lastEventTs: 0,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed, user: { ...defaultState.user, ...parsed.user } };
  } catch {
    return structuredClone(defaultState);
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user: state.user,
      transactions: state.transactions.slice(0, 50),
      lastEventTs: state.lastEventTs,
    }));
  } catch (e) {
    console.warn('NIGHTNET storage write failed', e);
  }
}

let state = load();
const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach(fn => fn(state));
  save(state);
}

export function addCredits(amount, label = 'SYSTEM CREDIT') {
  state.user.credits += amount;
  state.transactions.unshift({
    id: `tx-${Date.now()}`,
    amount,
    type: amount >= 0 ? 'credit' : 'debit',
    label,
    ts: Date.now(),
  });
  emit();
}

export function spendCredits(amount, label) {
  if (state.user.credits < amount) {
    return { ok: false, error: 'INSUFFICIENT_FUNDS' };
  }
  state.user.credits -= amount;
  state.transactions.unshift({
    id: `tx-${Date.now()}`,
    amount: -amount,
    type: 'debit',
    label,
    ts: Date.now(),
  });
  state.user.completedContracts += 1;
  // small reputation gain
  state.user.reputation = Math.min(100, state.user.reputation + 1);
  emit();
  return { ok: true };
}

export function toggleFavorite(serviceId) {
  const idx = state.user.favorites.indexOf(serviceId);
  if (idx >= 0) state.user.favorites.splice(idx, 1);
  else state.user.favorites.push(serviceId);
  emit();
}

export function setDistrict(district) {
  state.user.district = district;
  emit();
}

export function pushNotification(msg, type = 'info') {
  const n = { id: `n-${Date.now()}`, msg, type, ts: Date.now() };
  state.notifications.unshift(n);
  if (state.notifications.length > 20) state.notifications.pop();
  emit();
  return n;
}

export function clearNotifications() {
  state.notifications = [];
  emit();
}

export function setActiveEvent(event) {
  state.activeEvent = event;
  state.lastEventTs = Date.now();
  emit();
}

export function clearActiveEvent() {
  state.activeEvent = null;
  emit();
}

export function resetDemo() {
  state = structuredClone(defaultState);
  emit();
}

// expose for console easter egg
if (typeof window !== 'undefined') {
  window.__NIGHTNET__ = { getState, addCredits, spendCredits, resetDemo };
}
