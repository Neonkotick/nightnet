/**
 * Netrunning Runner — PHASE 6 foundation
 * Interface + 1d10 vs DV, Black ICE speed checks, node breach/download/control.
 *
 * Official concepts: Interface checks, floors, Password/File/Control/ICE.
 * ICE numeric stats are HOMEBREW placeholders — see ice.js.
 */

import { emit, Events } from '../core/eventBus.js';
import { processInput } from '../core/commandSandbox.js';
import { interfaceCheck, speedCheck } from '../core/dice.js';
import { getIce } from './ice.js';
import { NODE_TYPES } from './architecture.js';

let activeRun = null;

export function getActiveRun() {
  return activeRun;
}

export function isRunning() {
  return !!activeRun;
}

function currentFloor() {
  if (!activeRun) return null;
  return activeRun.architecture.floors[activeRun.currentFloorIndex] || null;
}

function logRun(msg) {
  if (!activeRun) return;
  activeRun.log.push({ t: Date.now(), msg });
  if (activeRun.log.length > 50) activeRun.log.shift();
}

export function jackIn(architecture, netrunner, options = {}) {
  if (!architecture || !architecture.floors?.length) {
    return { ok: false, error: 'NO_ARCHITECTURE' };
  }

  const floors = architecture.floors.map((f) => ({
    ...f,
    ice: (f.ice || []).map((id) => id),
    iceState: (f.ice || []).map((id) => {
      const def = getIce(id);
      return { id, rez: def.rez, maxRez: def.rez, name: def.name };
    }),
    breached: false,
    downloaded: false,
    controlled: false,
  }));

  activeRun = {
    architectureId: architecture.id,
    architecture: { ...architecture, floors },
    netrunner: {
      name: netrunner?.name || 'NETRUNNER',
      interface: netrunner?.interface ?? 4,
      hp: netrunner?.hp ?? 10,
      maxHp: netrunner?.maxHp ?? 10,
      programs: netrunner?.programs || [],
    },
    currentFloor: floors[0].id,
    currentFloorIndex: 0,
    cloaked: false,
    threat: options.threat || architecture.threatBase || 'LOW',
    mode: options.mode || 'standard',
    knownFloors: [floors[0].id],
    log: [],
    startedAt: Date.now(),
    slideUsed: false,
  };

  emit(Events.JACK_IN, { run: activeRun });
  emit(Events.FLOOR_ENTERED, { floor: floors[0] });
  return { ok: true, run: activeRun };
}

export function jackOut(reason = 'player') {
  if (!activeRun) return { ok: false, error: 'NOT_RUNNING' };
  const snapshot = { ...activeRun };
  activeRun = null;
  emit(Events.JACK_OUT, { reason, snapshot });
  return { ok: true };
}

function enterFloor(index) {
  const floors = activeRun.architecture.floors;
  if (!floors[index]) {
    return { success: false, message: `INVALID FLOOR. Valid: 0–${floors.length - 1}`, type: 'error' };
  }
  activeRun.currentFloorIndex = index;
  activeRun.currentFloor = floors[index].id;
  if (!activeRun.knownFloors.includes(floors[index].id)) {
    activeRun.knownFloors.push(floors[index].id);
  }
  emit(Events.FLOOR_ENTERED, { floor: floors[index] });

  const floor = floors[index];
  const lines = [`MOVED TO FLOOR ${index}: ${floor.label || floor.type} (DV ${floor.dv})`];

  if (floor.type === NODE_TYPES.BLACK_ICE || (floor.iceState && floor.iceState.some((i) => i.rez > 0))) {
    const live = (floor.iceState || []).filter((i) => i.rez > 0);
    if (live.length) {
      emit(Events.ICE_DETECTED, { ice: live, floor });
      const ice = getIce(live[0].id);
      const spd = speedCheck(activeRun.netrunner.interface, ice.spd);
      lines.push(spd.text);
      if (!spd.success) {
        const dmg = Math.floor(Math.random() * 6) + 1;
        activeRun.netrunner.hp = Math.max(0, activeRun.netrunner.hp - dmg);
        lines.push(`ICE HIT! You take ${dmg} damage (HP ${activeRun.netrunner.hp}/${activeRun.netrunner.maxHp}). [HOMEBREW dmg]`);
        emit(Events.ICE_ACTIVATED, { ice, damage: dmg });
        emit(Events.DAMAGE_TAKEN, { amount: dmg, hp: activeRun.netrunner.hp });
        if (activeRun.netrunner.hp <= 0) {
          lines.push('NETRUNNER DOWN — forced jack out.');
          jackOut('brain_damage');
          return { success: false, message: lines.join('\n'), type: 'error' };
        }
      } else {
        lines.push(`ICE (${ice.name}) failed to catch you.`);
      }
    }
  }

  logRun(lines.join(' | '));
  return { success: true, message: lines.join('\n'), type: 'success' };
}

function resolveBreach() {
  const floor = currentFloor();
  if (!floor) return { success: false, message: 'NO FLOOR', type: 'error' };
  if (floor.type === NODE_TYPES.LOBBY || floor.type === NODE_TYPES.EMPTY) {
    return { success: true, message: 'Nothing to breach on this floor.', type: 'info' };
  }
  if (floor.breached) {
    return { success: true, message: 'Already breached.', type: 'info' };
  }
  const check = interfaceCheck(activeRun.netrunner.interface, floor.dv || 8);
  const lines = [check.text];
  if (check.success) {
    floor.breached = true;
    emit(Events.NODE_BREACHED, { floor });
    lines.push(`BREACH SUCCESS — ${floor.label || floor.type} opened.`);
    logRun(`BREACH OK floor ${activeRun.currentFloorIndex}`);
    return { success: true, message: lines.join('\n'), type: 'success', action: 'breach' };
  }
  lines.push('BREACH FAILED. Try again (time cost) or spend Luck (table rule).');
  logRun(`BREACH FAIL floor ${activeRun.currentFloorIndex}`);
  return { success: false, message: lines.join('\n'), type: 'error', action: 'breach' };
}

function resolveDownload() {
  const floor = currentFloor();
  if (!floor) return { success: false, message: 'NO FLOOR', type: 'error' };
  if (floor.type !== NODE_TYPES.FILE && floor.type !== NODE_TYPES.SYSTEM) {
    return { success: false, message: 'No File/System node here. Move to a FILE floor.', type: 'error' };
  }
  if (floor.downloaded) {
    return { success: true, message: 'File already downloaded this run.', type: 'info' };
  }
  const check = interfaceCheck(activeRun.netrunner.interface, floor.dv || 8);
  const lines = [check.text];
  if (check.success) {
    floor.downloaded = true;
    emit(Events.FILE_DOWNLOADED, { floor });
    lines.push(`DOWNLOAD COMPLETE — ${floor.label || 'FILE'} secured.`);
    return { success: true, message: lines.join('\n'), type: 'success', action: 'download' };
  }
  lines.push('EYE-DEE / DOWNLOAD FAILED.');
  return { success: false, message: lines.join('\n'), type: 'error', action: 'download' };
}

function resolveControl() {
  const floor = currentFloor();
  if (!floor) return { success: false, message: 'NO FLOOR', type: 'error' };
  if (floor.type !== NODE_TYPES.CONTROL && floor.type !== NODE_TYPES.SYSTEM) {
    return { success: false, message: 'No Control Node here.', type: 'error' };
  }
  if (floor.controlled) {
    return { success: true, message: 'Control Node already under your control.', type: 'info' };
  }
  const check = interfaceCheck(activeRun.netrunner.interface, floor.dv || 8);
  const lines = [check.text];
  if (check.success) {
    floor.controlled = true;
    emit(Events.CONTROL_TAKEN, { floor });
    lines.push(`CONTROL TAKEN — ${floor.label || 'CONTROL NODE'} is yours.`);
    return { success: true, message: lines.join('\n'), type: 'success', action: 'control' };
  }
  lines.push('CONTROL ATTEMPT FAILED.');
  return { success: false, message: lines.join('\n'), type: 'error', action: 'control' };
}

function resolveAttack() {
  const floor = currentFloor();
  if (!floor) return { success: false, message: 'NO FLOOR', type: 'error' };
  const live = (floor.iceState || []).filter((i) => i.rez > 0);
  if (!live.length) {
    return { success: false, message: 'No active ICE on this floor.', type: 'error' };
  }
  const target = live[0];
  const ice = getIce(target.id);
  const dv = (ice.def || 2) + 5;
  const check = interfaceCheck(activeRun.netrunner.interface, dv);
  const lines = [
    `ATTACK ${ice.name} (REZ ${target.rez}/${target.maxRez})`,
    check.text + ' [HOMEBREW ATK vs DEF+5]',
  ];
  if (check.success) {
    const dmg = Math.floor(Math.random() * 6) + 3;
    target.rez = Math.max(0, target.rez - dmg);
    lines.push(`HIT for ${dmg} REZ. ICE REZ now ${target.rez}/${target.maxRez}.`);
    if (target.rez <= 0) {
      lines.push(`${ice.name} DEREZZED.`);
      emit(Events.ICE_DEREZZED, { ice: target, floor });
    }
    return { success: true, message: lines.join('\n'), type: 'success', action: 'attack' };
  }
  const counter = Math.floor(Math.random() * 4) + 1;
  activeRun.netrunner.hp = Math.max(0, activeRun.netrunner.hp - counter);
  lines.push(`MISS. ICE counters for ${counter} dmg. HP ${activeRun.netrunner.hp}/${activeRun.netrunner.maxHp}.`);
  if (activeRun.netrunner.hp <= 0) {
    lines.push('NETRUNNER DOWN — jack out.');
    jackOut('brain_damage');
  }
  return { success: false, message: lines.join('\n'), type: 'error', action: 'attack' };
}

function resolvePathfinder() {
  const check = interfaceCheck(activeRun.netrunner.interface, 8);
  const floors = activeRun.architecture.floors;
  const revealCount = check.success
    ? Math.min(floors.length, Math.max(1, Math.floor(check.total / 3)))
    : 1;
  for (let i = 0; i < revealCount; i++) {
    if (!activeRun.knownFloors.includes(floors[i].id)) {
      activeRun.knownFloors.push(floors[i].id);
    }
  }
  const lines = [
    check.text,
    `PATHFINDER reveals ${revealCount} floor(s):`,
    ...floors.map((f, i) => {
      const known = activeRun.knownFloors.includes(f.id);
      return known
        ? `  [${i}] ${f.type.toUpperCase()} DV${f.dv}${f.iceState?.some((x) => x.rez > 0) ? ' [ICE]' : ''}`
        : `  [${i}] ????`;
    }),
  ];
  return { success: check.success, message: lines.join('\n'), type: check.success ? 'success' : 'info', action: 'pathfinder' };
}

export function handleCommand(rawInput) {
  if (!activeRun) {
    return {
      success: false,
      message: 'NO ACTIVE CONNECTION. Jack in first.',
      type: 'error',
    };
  }

  const result = processInput(rawInput, {
    architecture: activeRun.architecture,
    runnerState: activeRun,
    netrunner: activeRun.netrunner,
    isGM: activeRun.mode === 'gm',
  });

  if (result.action === 'move' && result.args?.length) {
    const target = Number(result.args[0]);
    if (Number.isNaN(target)) {
      return { success: false, message: 'MOVE requires floor index, e.g. MOVE 2', type: 'error' };
    }
    return enterFloor(target);
  }

  if (result.action === 'scan') {
    const floor = currentFloor();
    const liveIce = (floor.iceState || []).filter((i) => i.rez > 0);
    const iceNote = liveIce.length
      ? ` · ICE: ${liveIce.map((i) => `${i.name}(${i.rez})`).join(', ')}`
      : '';
    const flags = [
      floor.breached ? 'BREACHED' : null,
      floor.downloaded ? 'DOWNLOADED' : null,
      floor.controlled ? 'CONTROLLED' : null,
    ].filter(Boolean).join(', ');
    return {
      success: true,
      message: `SCAN: ${floor.label || floor.type} · DV ${floor.dv}${iceNote}${flags ? ' · ' + flags : ''}\nConnections: [${(floor.connections || []).join(', ')}]\nHP ${activeRun.netrunner.hp}/${activeRun.netrunner.maxHp} · IF ${activeRun.netrunner.interface}`,
      type: 'info',
      action: 'scan',
    };
  }

  if (result.action === 'pathfinder') return resolvePathfinder();

  if (result.action === 'cloak') {
    const check = interfaceCheck(activeRun.netrunner.interface, 10);
    if (check.success) {
      activeRun.cloaked = true;
      return { success: true, message: check.text + '\nCLOAK ENGAGED.', type: 'success', action: 'cloak' };
    }
    return { success: false, message: check.text + '\nCLOAK FAILED.', type: 'error', action: 'cloak' };
  }

  if (result.action === 'jack_out') {
    jackOut('command');
    return { success: true, message: 'JACK OUT INITIATED. Connection closed.', type: 'info', action: 'jack_out' };
  }

  if (result.action === 'breach') return resolveBreach();
  if (result.action === 'download') return resolveDownload();
  if (result.action === 'control') return resolveControl();
  if (result.action === 'attack') return resolveAttack();

  if (result.action === 'slide') {
    if (activeRun.slideUsed) {
      return { success: false, message: 'SLIDE already used this run (once per round/run — simplified).', type: 'error' };
    }
    activeRun.slideUsed = true;
    return { success: true, message: 'SLIDE — you disengage from ICE this action. [SIMPLIFIED]', type: 'success', action: 'slide' };
  }

  return result;
}

export function setThreat(level) {
  if (!activeRun) return;
  activeRun.threat = level;
  emit(Events.THREAT_CHANGED, { level });
}
