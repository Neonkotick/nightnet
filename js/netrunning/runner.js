/**
 * Netrunning Runner (stub for PHASE 6)
 *
 * Holds current run state. Real combat / DV rolls come later.
 * Currently provides structure and safe jack-in / jack-out.
 */

import { emit, Events } from '../core/eventBus.js';
import { processInput } from '../core/commandSandbox.js';

let activeRun = null;

export function getActiveRun() {
  return activeRun;
}

export function isRunning() {
  return !!activeRun;
}

/**
 * Start a netrun
 */
export function jackIn(architecture, netrunner, options = {}) {
  if (!architecture || !architecture.floors?.length) {
    return { ok: false, error: 'NO_ARCHITECTURE' };
  }

  activeRun = {
    architectureId: architecture.id,
    architecture,
    netrunner: {
      name: netrunner?.name || 'NETRUNNER',
      interface: netrunner?.interface ?? 4,
      hp: netrunner?.hp ?? 10,
      maxHp: netrunner?.maxHp ?? 10,
      programs: netrunner?.programs || [],
    },
    currentFloor: architecture.floors[0].id,
    currentFloorIndex: 0,
    cloaked: false,
    threat: options.threat || architecture.threatBase || 'LOW',
    mode: options.mode || 'standard',
    knownFloors: [architecture.floors[0].id],
    log: [],
    startedAt: Date.now(),
  };

  emit(Events.JACK_IN, { run: activeRun });
  emit(Events.FLOOR_ENTERED, { floor: architecture.floors[0] });
  return { ok: true, run: activeRun };
}

export function jackOut(reason = 'player') {
  if (!activeRun) return { ok: false, error: 'NOT_RUNNING' };
  const snapshot = { ...activeRun };
  activeRun = null;
  emit(Events.JACK_OUT, { reason, snapshot });
  return { ok: true };
}

/**
 * Process a terminal command during a run
 */
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
    const floors = activeRun.architecture.floors;
    if (!Number.isNaN(target) && floors[target]) {
      activeRun.currentFloorIndex = target;
      activeRun.currentFloor = floors[target].id;
      if (!activeRun.knownFloors.includes(floors[target].id)) {
        activeRun.knownFloors.push(floors[target].id);
      }
      emit(Events.FLOOR_ENTERED, { floor: floors[target] });
      return {
        success: true,
        message: `MOVED TO FLOOR ${target}: ${floors[target].label || floors[target].type}`,
        type: 'success',
      };
    }
    return {
      success: false,
      message: `INVALID FLOOR INDEX. Valid: 0–${floors.length - 1}`,
      type: 'error',
    };
  }

  if (result.action === 'scan') {
    const floor = activeRun.architecture.floors[activeRun.currentFloorIndex];
    const iceNote = floor.ice?.length ? ` · ICE PRESENT (${floor.ice.length})` : '';
    return {
      success: true,
      message: `SCAN: ${floor.label || floor.type} · DV ${floor.dv}${iceNote}\nConnections: [${(floor.connections || []).join(', ')}]`,
      type: 'info',
      action: 'scan',
    };
  }

  if (result.action === 'pathfinder') {
    const floors = activeRun.architecture.floors;
    const lines = floors.map((f, i) => {
      const known = activeRun.knownFloors.includes(f.id) || i === 0;
      return known
        ? `  [${i}] ${f.type.toUpperCase()} DV${f.dv}`
        : `  [${i}] ????`;
    });
    return {
      success: true,
      message: 'PATHFINDER RESULT:\n' + lines.join('\n') + '\n(Full reveal requires Interface check — PHASE 6)',
      type: 'info',
      action: 'pathfinder',
    };
  }

  if (result.action === 'cloak') {
    activeRun.cloaked = true;
    return {
      success: true,
      message: 'CLOAK ENGAGED. Presence masked.',
      type: 'success',
      action: 'cloak',
    };
  }

  if (result.action === 'jack_out') {
    jackOut('command');
    return {
      success: true,
      message: 'JACK OUT INITIATED. Connection closed.',
      type: 'info',
      action: 'jack_out',
    };
  }

  if (['breach', 'download', 'control', 'attack', 'slide'].includes(result.action)) {
    return {
      success: true,
      message: `${result.action.toUpperCase()} — full resolution in PHASE 6 (DV rolls + ICE combat). Command accepted.`,
      type: 'info',
      action: result.action,
      args: result.args,
    };
  }

  return result;
}

export function setThreat(level) {
  if (!activeRun) return;
  activeRun.threat = level;
  emit(Events.THREAT_CHANGED, { level });
}
