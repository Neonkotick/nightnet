/**
 * Net Architecture Model + basic utilities
 *
 * Official Cyberpunk RED concepts used:
 * - Floors / rooms in sequence
 * - Password, File, Control Node, Black ICE, Daemon
 * - DV values
 *
 * This is a data model + helper. Full gameplay lives in runner.js.
 */

import { emit, Events } from '../core/eventBus.js';

/** Official-ish node types (names only, no copyrighted tables) */
export const NODE_TYPES = Object.freeze({
  PASSWORD: 'password',
  FILE: 'file',
  CONTROL: 'control',
  BLACK_ICE: 'black_ice',
  DAEMON: 'daemon',
  LOBBY: 'lobby',
  SYSTEM: 'system',
  EMPTY: 'empty',
});

/**
 * Create a minimal valid architecture
 */
export function createEmptyArchitecture(name = 'UNNAMED ARCH') {
  return {
    id: `arch-${Date.now().toString(36)}`,
    name,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    threatBase: 'LOW',
    floors: [
      {
        id: 'floor-0',
        index: 0,
        type: NODE_TYPES.LOBBY,
        label: 'LOBBY',
        dv: 0,
        hidden: false,
        ice: [],
        connections: [1],
        notes: '',
      },
    ],
    branches: [],
    meta: {
      author: 'GM',
      tags: [],
    },
  };
}

/**
 * Simple linear architecture generator (placeholder)
 * RULE NEEDS VERIFICATION for exact official generation tables.
 * This is a HOMEBREW helper for quick sessions.
 */
export function generateSimpleArchitecture({ name = 'QUICK RUN', floors = 5, baseDV = 8 } = {}) {
  const arch = createEmptyArchitecture(name);
  const types = [
    NODE_TYPES.PASSWORD,
    NODE_TYPES.FILE,
    NODE_TYPES.PASSWORD,
    NODE_TYPES.BLACK_ICE,
    NODE_TYPES.CONTROL,
    NODE_TYPES.FILE,
    NODE_TYPES.BLACK_ICE,
    NODE_TYPES.SYSTEM,
  ];

  arch.floors = [];
  for (let i = 0; i < floors; i++) {
    const type = i === 0 ? NODE_TYPES.LOBBY : types[(i - 1) % types.length];
    const dv = type === NODE_TYPES.LOBBY ? 0 : baseDV + Math.floor(i / 2);
    arch.floors.push({
      id: `floor-${i}`,
      index: i,
      type,
      label: type === NODE_TYPES.LOBBY ? 'LOBBY' : `${type.toUpperCase()} ${i}`,
      dv: Math.min(dv, 12),
      hidden: false,
      ice: type === NODE_TYPES.BLACK_ICE ? [`ice-placeholder-${i}`] : [],
      connections: i < floors - 1 ? [i + 1] : [],
      notes: '',
    });
  }
  arch.updatedAt = Date.now();
  return arch;
}

/**
 * Validate architecture structure (basic)
 */
export function validateArchitecture(arch) {
  const errors = [];
  if (!arch || typeof arch !== 'object') {
    errors.push('Architecture is not an object');
    return { ok: false, errors };
  }
  if (!Array.isArray(arch.floors) || arch.floors.length === 0) {
    errors.push('No floors defined');
  }
  arch.floors?.forEach((f, i) => {
    if (f.index !== i) errors.push(`Floor ${i} has wrong index`);
    if (!Object.values(NODE_TYPES).includes(f.type)) {
      errors.push(`Floor ${i}: unknown type ${f.type}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

/**
 * Serialize / deserialize helpers
 */
export function exportArchitecture(arch) {
  return JSON.stringify(arch, null, 2);
}

export function importArchitecture(json) {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const check = validateArchitecture(data);
    if (!check.ok) {
      return { ok: false, error: check.errors.join('; ') };
    }
    emit(Events.ARCHITECTURE_LOADED, { architecture: data });
    return { ok: true, architecture: data };
  } catch (e) {
    return { ok: false, error: 'INVALID_JSON' };
  }
}

/**
 * Get visible floors for a player (respects Pathfinder / hidden)
 */
export function getVisibleFloors(arch, knownFloorIds = []) {
  if (!arch) return [];
  return arch.floors.filter(f => !f.hidden || knownFloorIds.includes(f.id));
}

/**
 * Builder helpers — mutate architecture in place (GM tool)
 */
export function addFloor(arch, { type = NODE_TYPES.PASSWORD, dv = 8, label = '', ice = [] } = {}) {
  if (!arch?.floors) return arch;
  const index = arch.floors.length;
  if (index > 0) {
    const prev = arch.floors[index - 1];
    if (!prev.connections?.includes(index)) {
      prev.connections = [...(prev.connections || []), index];
    }
  }
  arch.floors.push({
    id: `floor-${index}-${Date.now().toString(36)}`,
    index,
    type,
    label: label || `${type.toUpperCase()} ${index}`,
    dv: type === NODE_TYPES.LOBBY ? 0 : Math.min(12, Math.max(0, Number(dv) || 8)),
    hidden: false,
    ice: type === NODE_TYPES.BLACK_ICE ? (ice.length ? ice : [`ice-placeholder-${index}`]) : ice,
    connections: [],
    notes: '',
  });
  arch.updatedAt = Date.now();
  emit(Events.ARCHITECTURE_CHANGED, { architecture: arch });
  return arch;
}

export function removeFloor(arch, index) {
  if (!arch?.floors || index <= 0 || index >= arch.floors.length) return arch;
  arch.floors.splice(index, 1);
  arch.floors.forEach((f, i) => {
    f.index = i;
    f.connections = (f.connections || []).filter((c) => c < arch.floors.length).map((c) => (c > index ? c - 1 : c));
  });
  arch.updatedAt = Date.now();
  emit(Events.ARCHITECTURE_CHANGED, { architecture: arch });
  return arch;
}

export function updateFloor(arch, index, patch) {
  if (!arch?.floors?.[index]) return arch;
  const f = arch.floors[index];
  if (patch.type && Object.values(NODE_TYPES).includes(patch.type)) f.type = patch.type;
  if (patch.dv != null) f.dv = Math.min(12, Math.max(0, Number(patch.dv)));
  if (patch.label != null) f.label = String(patch.label);
  if (patch.hidden != null) f.hidden = !!patch.hidden;
  if (Array.isArray(patch.ice)) f.ice = patch.ice;
  arch.updatedAt = Date.now();
  emit(Events.ARCHITECTURE_CHANGED, { architecture: arch });
  return arch;
}
