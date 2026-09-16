/**
 * Immersion Level System
 *
 * LEVEL 1 — Minimal      : clean UI, almost no effects
 * LEVEL 2 — Tactical     : light indicators, basic feedback
 * LEVEL 3 — Cinematic    : more animations, sound cues
 * LEVEL 4 — Immersive    : strong CRT / glitch / scanlines
 * LEVEL 5 — Full Interface : maximum terminal feel
 *
 * This is PRESENTATION ONLY. It never changes game rules.
 */

import { emit, Events } from '../core/eventBus.js';

export const IMMERSION_LEVELS = Object.freeze({
  1: { id: 1, name: 'MINIMAL',    class: 'immersion-1' },
  2: { id: 2, name: 'TACTICAL',   class: 'immersion-2' },
  3: { id: 3, name: 'CINEMATIC',  class: 'immersion-3' },
  4: { id: 4, name: 'IMMERSIVE',  class: 'immersion-4' },
  5: { id: 5, name: 'FULL IFACE', class: 'immersion-5' },
});

let currentLevel = 3;

export function getImmersionLevel() {
  return currentLevel;
}

export function setImmersionLevel(level) {
  const n = Math.max(1, Math.min(5, Number(level) || 3));
  if (n === currentLevel) return currentLevel;
  currentLevel = n;
  applyToDOM();
  emit(Events.IMMERSION_CHANGED, { level: currentLevel, meta: IMMERSION_LEVELS[currentLevel] });
  return currentLevel;
}

function applyToDOM() {
  const root = document.documentElement;
  // Remove previous
  for (let i = 1; i <= 5; i++) {
    root.classList.remove(`immersion-${i}`);
  }
  root.classList.add(`immersion-${currentLevel}`);
  root.dataset.immersion = String(currentLevel);
}

/**
 * Call once on boot
 */
export function initImmersion(savedLevel) {
  if (savedLevel) currentLevel = Math.max(1, Math.min(5, Number(savedLevel) || 3));
  applyToDOM();
}

/**
 * Helper: should we show heavy visual effects?
 */
export function isHeavyFX() {
  return currentLevel >= 4;
}

export function isSoundEnabledByImmersion() {
  return currentLevel >= 2;
}
