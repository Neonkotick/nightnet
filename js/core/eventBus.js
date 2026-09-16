/**
 * NIGHTNET Event Bus
 * Lightweight pub/sub for game events, UI updates and GM actions.
 * No external dependencies.
 */

const listeners = new Map();

/**
 * Subscribe to an event.
 * @param {string} event
 * @param {Function} handler
 * @returns {Function} unsubscribe
 */
export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => off(event, handler);
}

/**
 * Unsubscribe
 */
export function off(event, handler) {
  const set = listeners.get(event);
  if (set) set.delete(handler);
}

/**
 * Emit event with optional payload
 */
export function emit(event, payload = null) {
  const set = listeners.get(event);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[EventBus] handler error for "${event}":`, err);
    }
  }
}

/**
 * One-time listener
 */
export function once(event, handler) {
  const unsub = on(event, (payload) => {
    unsub();
    handler(payload);
  });
  return unsub;
}

/**
 * Clear all listeners (useful for tests / reset)
 */
export function clearAll() {
  listeners.clear();
}

// Common event names (documentation only — not enforced)
export const Events = Object.freeze({
  // System
  BOOT: 'system:boot',
  LOG: 'system:log',
  TOAST: 'system:toast',

  // Immersion / Threat
  IMMERSION_CHANGED: 'immersion:changed',
  THREAT_CHANGED: 'threat:changed',

  // Netrunning
  JACK_IN: 'net:jack_in',
  JACK_OUT: 'net:jack_out',
  FLOOR_ENTERED: 'net:floor_entered',
  NODE_BREACHED: 'net:node_breached',
  ICE_DETECTED: 'net:ice_detected',
  ICE_ACTIVATED: 'net:ice_activated',
  ICE_DEREZZED: 'net:ice_derezzed',
  ALARM_TRIGGERED: 'net:alarm',
  TRACE_STARTED: 'net:trace',
  FILE_DOWNLOADED: 'net:file_downloaded',
  CONTROL_TAKEN: 'net:control_taken',
  CONNECTION_LOST: 'net:connection_lost',

  // Character
  CHARACTER_UPDATED: 'char:updated',
  DAMAGE_TAKEN: 'char:damage',

  // GM
  GM_EVENT: 'gm:event',
  ARCHITECTURE_LOADED: 'gm:arch_loaded',
  ARCHITECTURE_CHANGED: 'gm:arch_changed',

  // Services
  SERVICE_REQUESTED: 'service:requested',
  TRAUMA_CALLED: 'service:trauma',
});
