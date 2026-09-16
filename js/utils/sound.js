/**
 * NIGHTNET Sound Architecture
 * Stub ready for real SFX. No copyrighted assets included.
 *
 * Usage later:
 *   import { play } from './utils/sound.js';
 *   play('click');
 *
 * Place audio files in /assets/sfx/ and map them in SOUNDS.
 */

const SOUNDS = {
  click: null,       // 'assets/sfx/click.mp3'
  notification: null,
  error: null,
  confirm: null,
  boot: null,
  glitch: null,
  alert: null,
};

let enabled = true;

export function setSoundEnabled(v) {
  enabled = !!v;
}

export function play(name) {
  if (!enabled || !SOUNDS[name]) return;
  try {
    const audio = new Audio(SOUNDS[name]);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch {
    // silent fail
  }
}

// Hook example for future:
// document.addEventListener('click', (e) => {
//   if (e.target.matches('button, .nav-btn, .chip, .service-card')) play('click');
// });
