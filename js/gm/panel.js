/**
 * GM Panel — architectures, threat, force events, simple builder
 */
import { emit, Events } from '../core/eventBus.js';
import {
  generateSimpleArchitecture, exportArchitecture, importArchitecture,
  addFloor, removeFloor, updateFloor, NODE_TYPES, createEmptyArchitecture
} from '../netrunning/architecture.js';
import { getActiveRun, setThreat, jackOut } from '../netrunning/runner.js';
import { getState, setThreatLevel, saveArchitectureMeta } from '../state/store.js';

let currentArch = null;

export function getCurrentArchitecture() {
  return currentArch;
}

export function loadArchitecture(arch) {
  currentArch = arch;
  emit(Events.ARCHITECTURE_LOADED, { architecture: arch });
  if (arch) {
    saveArchitectureMeta({
      id: arch.id,
      name: arch.name,
      floors: arch.floors?.length || 0,
      threatBase: arch.threatBase,
    });
  }
  return arch;
}

export function createQuickArchitecture(options = {}) {
  const arch = generateSimpleArchitecture(options);
  return loadArchitecture(arch);
}

export function createBlankArchitecture(name = 'CUSTOM ARCH') {
  return loadArchitecture(createEmptyArchitecture(name));
}

export function gmAddFloor(opts) {
  if (!currentArch) createBlankArchitecture();
  addFloor(currentArch, opts);
  return currentArch;
}

export function gmRemoveFloor(index) {
  if (!currentArch) return null;
  removeFloor(currentArch, index);
  return currentArch;
}

export function gmUpdateFloor(index, patch) {
  if (!currentArch) return null;
  updateFloor(currentArch, index, patch);
  return currentArch;
}

export function forceThreat(level) {
  setThreatLevel(level);
  setThreat(level);
  emit(Events.THREAT_CHANGED, { level });
  return level;
}

export function forceEvent(eventType, payload = {}) {
  emit(Events.GM_EVENT, { type: eventType, ...payload });
  emit(Events.LOG, { msg: `GM EVENT: ${eventType}` });
}

export function forceJackOut() {
  if (getActiveRun()) {
    jackOut('gm');
    return true;
  }
  return false;
}

export function getGMSnapshot() {
  const run = getActiveRun();
  const state = getState();
  return {
    architecture: currentArch,
    activeRun: run
      ? {
          floorIndex: run.currentFloorIndex,
          floorId: run.currentFloor,
          threat: run.threat,
          cloaked: run.cloaked,
          mode: run.mode,
          knownFloors: run.knownFloors,
          netrunner: run.netrunner,
        }
      : null,
    settings: state.settings,
    savedArchitectures: state.savedArchitectures || [],
    nodeTypes: Object.values(NODE_TYPES),
  };
}

export function exportCurrentArch() {
  if (!currentArch) return null;
  return exportArchitecture(currentArch);
}

export function importArchFromJSON(json) {
  const result = importArchitecture(json);
  if (result.ok) {
    loadArchitecture(result.architecture);
  }
  return result;
}
