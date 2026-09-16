/**
 * Black ICE library (fan tool)
 *
 * Numeric stats are HOMEBREW / PLACEHOLDER for session flow —
 * GMs should override with official book values at the table.
 * RULE NEEDS VERIFICATION — do not treat numbers as official.
 */

export const ICE_LIBRARY = Object.freeze({
  'ice-placeholder': {
    id: 'ice-placeholder',
    name: 'UNKNOWN ICE',
    type: 'black',
    per: 4, spd: 4, atk: 4, def: 2, rez: 10,
    effect: 'Deals damage on hit. GM sets exact effect from rulebook.',
    homebrew: true,
  },
  skunk: {
    id: 'skunk', name: 'SKUNK', type: 'black',
    per: 4, spd: 4, atk: 4, def: 2, rez: 15,
    effect: 'HOMEBREW placeholder — use official Skunk stats from CRB.',
    homebrew: true,
  },
  killer: {
    id: 'killer', name: 'KILLER', type: 'black',
    per: 6, spd: 5, atk: 6, def: 3, rez: 20,
    effect: 'HOMEBREW placeholder — use official Killer stats from CRB.',
    homebrew: true,
  },
  hellhound: {
    id: 'hellhound', name: 'HELLHOUND', type: 'black',
    per: 6, spd: 6, atk: 7, def: 3, rez: 25,
    effect: 'HOMEBREW placeholder — use official Hellhound stats from CRB.',
    homebrew: true,
  },
  scorpion: {
    id: 'scorpion', name: 'SCORPION', type: 'black',
    per: 5, spd: 5, atk: 5, def: 3, rez: 18,
    effect: 'HOMEBREW placeholder — use official Scorpion stats from CRB.',
    homebrew: true,
  },
});

export function getIce(id) {
  if (!id) return { ...ICE_LIBRARY['ice-placeholder'] };
  const key = String(id).replace(/^ice-placeholder-\d+$/, 'ice-placeholder');
  if (ICE_LIBRARY[key]) return { ...ICE_LIBRARY[key], id: String(id) };
  if (String(id).startsWith('ice-placeholder')) {
    return { ...ICE_LIBRARY['ice-placeholder'], id: String(id) };
  }
  return {
    id: String(id),
    name: String(id).toUpperCase(),
    type: 'black',
    per: 4, spd: 4, atk: 4, def: 2, rez: 12,
    effect: 'Unknown ICE — GM assigns stats (HOMEBREW).',
    homebrew: true,
  };
}

export function listIce() {
  return Object.values(ICE_LIBRARY);
}
