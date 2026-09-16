/**
 * Netrun Terminal + GM Panel UI handlers
 * PHASE 3 + builder + PHASE 6 integration
 */
import { getState, setImmersionLevel as storeSetImmersion, setThreatLevel as storeSetThreat } from '../state/store.js';
import { on, Events } from '../core/eventBus.js';
import { jackIn, jackOut, handleCommand, isRunning, getActiveRun } from '../netrunning/runner.js';
import {
  createQuickArchitecture, forceThreat, forceJackOut, getGMSnapshot,
  exportCurrentArch, getCurrentArchitecture,
  gmAddFloor, gmRemoveFloor, createBlankArchitecture
} from '../gm/panel.js';
import { setImmersionLevel } from './immersion.js';

const $ = (sel, root = document) => root.querySelector(sel);

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  const box = $('#toasts');
  if (box) {
    box.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
}

function log(msg) {
  const logEl = $('#sys-log');
  if (!logEl) return;
  const line = document.createElement('div');
  line.textContent = `> ${msg}`;
  logEl.prepend(line);
  while (logEl.children.length > 12) logEl.lastChild.remove();
}

export function appendNetrunOutput(text, type = 'info') {
  const out = $('#netrun-output');
  if (!out) return;
  const prefix = type === 'error' ? '!' : type === 'success' ? '✓' : '>';
  out.textContent += `${prefix} ${text}\n`;
  out.scrollTop = out.scrollHeight;
}

export function renderNetrun() {
  const run = getActiveRun();
  const statusEl = $('#netrun-status');
  const infoEl = $('#netrun-floor-info');
  const input = $('#netrun-input');
  if (!statusEl) return;
  if (run) {
    statusEl.textContent = 'CONNECTED';
    statusEl.style.color = 'var(--neon-green)';
    const floor = run.architecture.floors[run.currentFloorIndex];
    if (infoEl) {
      infoEl.innerHTML = `FLOOR ${run.currentFloorIndex}: <strong>${floor?.label || floor?.type}</strong> · DV ${floor?.dv ?? '—'} · THREAT ${run.threat} · CLOAK ${run.cloaked ? 'ON' : 'OFF'}`;
    }
    if (input) input.disabled = false;
  } else {
    statusEl.textContent = 'OFFLINE';
    statusEl.style.color = '';
    if (infoEl) {
      infoEl.textContent = 'No active connection. Generate architecture (GM or QUICK ARCH), then JACK IN.';
    }
    if (input) input.disabled = true;
  }
}

export function renderGM() {
  const snap = getGMSnapshot();
  const preview = $('#gm-arch-preview');
  const runStatus = $('#gm-run-status');
  if (!preview) return;
  if (snap.architecture) {
    const floors = snap.architecture.floors
      .map((f, i) => `  [${i}] ${String(f.type).toUpperCase().padEnd(10)} DV${String(f.dv).padStart(2)}  ${f.label || ''}`)
      .join('\n');
    preview.textContent = `${snap.architecture.name}\nID: ${snap.architecture.id}\nTHREAT BASE: ${snap.architecture.threatBase}\n\nFLOORS:\n${floors}`;
  } else {
    preview.textContent = 'No architecture loaded.';
  }
  if (runStatus) {
    if (snap.activeRun) {
      const r = snap.activeRun;
      runStatus.innerHTML = `ACTIVE · Floor ${r.floorIndex} · Threat ${r.threat} · Cloaked ${r.cloaked ? 'YES' : 'NO'} · Mode ${r.mode}`;
    } else {
      runStatus.textContent = 'No active netrun.';
    }
  }
  const threatSel = $('#gm-threat-select');
  if (threatSel) threatSel.value = snap.settings?.threatLevel || 'LOW';
  const immSel = $('#gm-immersion-select');
  if (immSel) immSel.value = String(snap.settings?.immersionLevel || 3);
}

export function initNetrunUI() {
  $('#btn-quick-arch')?.addEventListener('click', () => {
    const arch = createQuickArchitecture({ name: 'QUICK RUN', floors: 5, baseDV: 8 });
    appendNetrunOutput(`ARCHITECTURE LOADED: ${arch.name} (${arch.floors.length} floors)`, 'success');
    log(`ARCH GENERATED: ${arch.name}`);
    toast('QUICK ARCHITECTURE READY', 'success');
    renderNetrun();
    renderGM();
  });

  $('#btn-jack-in')?.addEventListener('click', () => {
    let arch = getCurrentArchitecture();
    if (!arch) {
      arch = createQuickArchitecture({ name: 'AUTO ARCH', floors: 5, baseDV: 8 });
    }
    const nr = getState().netrunner;
    const res = jackIn(arch, nr, {
      mode: 'standard',
      threat: getState().settings?.threatLevel || 'LOW',
    });
    if (res.ok) {
      appendNetrunOutput('JACK IN SUCCESSFUL. NEURAL LINK ESTABLISHED.', 'success');
      appendNetrunOutput(`ENTERED ${arch.floors[0].label}. Type HELP for commands.`, 'info');
      toast('JACKED IN', 'success');
      log('NETRUN: JACK IN');
    } else {
      appendNetrunOutput(`JACK IN FAILED: ${res.error}`, 'error');
    }
    renderNetrun();
    renderGM();
  });

  $('#btn-jack-out')?.addEventListener('click', () => {
    if (!isRunning()) {
      appendNetrunOutput('NOT CONNECTED.', 'error');
      return;
    }
    jackOut('player');
    appendNetrunOutput('CONNECTION TERMINATED. JACK OUT COMPLETE.', 'info');
    toast('JACKED OUT', 'info');
    log('NETRUN: JACK OUT');
    renderNetrun();
    renderGM();
  });

  $('#netrun-input')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const raw = e.target.value;
    e.target.value = '';
    if (!raw.trim()) return;
    appendNetrunOutput(raw, 'info');
    const result = handleCommand(raw);
    if (result.message) {
      result.message.split('\n').forEach((line) => appendNetrunOutput(line, result.type || 'info'));
    }
    renderNetrun();
    renderGM();
  });

  $('#gm-gen-arch')?.addEventListener('click', () => {
    createQuickArchitecture({
      name: 'GM ARCH ' + new Date().toLocaleTimeString(),
      floors: 6,
      baseDV: 8,
    });
    toast('ARCHITECTURE GENERATED', 'success');
    log('GM: ARCHITECTURE GENERATED');
    renderGM();
    renderNetrun();
  });

  $('#gm-export-arch')?.addEventListener('click', () => {
    const json = exportCurrentArch();
    if (!json) {
      toast('NO ARCHITECTURE TO EXPORT', 'error');
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json)
        .then(() => toast('ARCHITECTURE COPIED TO CLIPBOARD', 'success'))
        .catch(() => {
          appendNetrunOutput('EXPORT:\n' + json, 'info');
          toast('EXPORT PRINTED TO NETRUN LOG', 'info');
        });
    } else {
      appendNetrunOutput('EXPORT:\n' + json, 'info');
      toast('EXPORT PRINTED TO NETRUN LOG', 'info');
    }
  });

  $('#gm-force-jackout')?.addEventListener('click', () => {
    if (forceJackOut()) {
      toast('PLAYER FORCED TO JACK OUT', 'info');
      log('GM: FORCE JACK OUT');
      renderNetrun();
      renderGM();
    } else {
      toast('NO ACTIVE RUN', 'error');
    }
  });

  $('#gm-threat-select')?.addEventListener('change', (e) => {
    forceThreat(e.target.value);
    storeSetThreat(e.target.value);
    toast(`THREAT → ${e.target.value}`, 'info');
    log(`GM: THREAT ${e.target.value}`);
    renderGM();
    renderNetrun();
  });

  $('#gm-immersion-select')?.addEventListener('change', (e) => {
    const lvl = Number(e.target.value);
    setImmersionLevel(lvl);
    storeSetImmersion(lvl);
    toast(`IMMERSION LEVEL ${lvl}`, 'info');
    log(`IMMERSION → ${lvl}`);
  });

  $('#gm-add-floor')?.addEventListener('click', () => {
    const type = $('#gm-floor-type')?.value || 'password';
    const dv = Number($('#gm-floor-dv')?.value) || 8;
    if (!getCurrentArchitecture()) createBlankArchitecture('CUSTOM ARCH');
    gmAddFloor({ type, dv });
    toast(`FLOOR ADDED: ${type.toUpperCase()} DV${dv}`, 'success');
    renderGM();
  });

  $('#gm-remove-floor')?.addEventListener('click', () => {
    const arch = getCurrentArchitecture();
    if (!arch || arch.floors.length <= 1) {
      toast('CANNOT REMOVE LOBBY', 'error');
      return;
    }
    gmRemoveFloor(arch.floors.length - 1);
    toast('LAST FLOOR REMOVED', 'info');
    renderGM();
  });

  on(Events.JACK_IN, () => { renderNetrun(); renderGM(); });
  on(Events.JACK_OUT, () => { renderNetrun(); renderGM(); });
  on(Events.FLOOR_ENTERED, (p) => {
    if (p?.floor) appendNetrunOutput(`ENTERED FLOOR: ${p.floor.label || p.floor.type}`, 'success');
    renderNetrun();
  });
  on(Events.THREAT_CHANGED, (p) => {
    if (p?.level) appendNetrunOutput(`THREAT LEVEL: ${p.level}`, 'info');
  });
}
