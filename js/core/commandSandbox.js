/**
 * NIGHTNET Command Sandbox
 *
 * CRITICAL SECURITY:
 * - Only a fixed whitelist of game commands is accepted.
 * - No eval, no Function constructor, no shell, no real network,
 *   no filesystem access, no arbitrary JS execution.
 * - User input is tokenized and matched against known verbs.
 * - This is a pure game simulation for Cyberpunk RED tabletop.
 */

/** @typedef {{ success: boolean, message: string, type?: string, action?: string, args?: string[] }} CommandResult */

const COMMANDS = Object.freeze({
  // Movement / navigation
  SCAN: {
    aliases: ['scan', 'look', 'ls', 'dir'],
    description: 'Scan current floor / node',
    action: 'scan',
  },
  MOVE: {
    aliases: ['move', 'go', 'cd', 'enter'],
    description: 'Move to floor index (e.g. MOVE 2)',
    action: 'move',
    minArgs: 1,
  },
  PATHFINDER: {
    aliases: ['pathfinder', 'path', 'map'],
    description: 'Reveal structure of the architecture (Interface check)',
    action: 'pathfinder',
  },

  // Breach / interaction
  BREACH: {
    aliases: ['breach', 'backdoor', 'crack', 'hack'],
    description: 'Attempt to breach Password / Control Node',
    action: 'breach',
  },
  DOWNLOAD: {
    aliases: ['download', 'get', 'eye-dee', 'eyedee'],
    description: 'Download / Eye-Dee a File',
    action: 'download',
  },
  CONTROL: {
    aliases: ['control', 'takeover', 'activate'],
    description: 'Take control of a Control Node',
    action: 'control',
  },

  // Combat / ICE
  ATTACK: {
    aliases: ['attack', 'zap', 'sword', 'kill'],
    description: 'Attack active Black ICE',
    action: 'attack',
  },
  SLIDE: {
    aliases: ['slide'],
    description: 'Slide (escape ICE, once per round)',
    action: 'slide',
  },

  // Stealth / utility
  CLOAK: {
    aliases: ['cloak', 'hide'],
    description: 'Cloak your presence',
    action: 'cloak',
  },
  STATUS: {
    aliases: ['status', 'st', 'whoami', 'info'],
    description: 'Show current run status',
    action: 'status',
  },
  HELP: {
    aliases: ['help', '?', 'commands'],
    description: 'List available commands',
    action: 'help',
  },

  // Exit
  JACK_OUT: {
    aliases: ['jackout', 'jack-out', 'exit', 'quit', 'logout', 'disconnect'],
    description: 'Jack out of the architecture',
    action: 'jack_out',
  },
});

// Build fast lookup map
const ALIAS_MAP = new Map();
for (const [key, def] of Object.entries(COMMANDS)) {
  for (const alias of def.aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), { key, ...def });
  }
}

/**
 * Tokenize and sanitize input.
 * Only alphanumeric, spaces, hyphens, underscores allowed.
 */
function tokenize(raw) {
  if (typeof raw !== 'string') return [];
  const cleaned = raw
    .trim()
    .slice(0, 200) // hard length limit
    .replace(/[^\w\s\-./]/g, '')
    .toLowerCase();
  return cleaned.split(/\s+/).filter(Boolean);
}

/**
 * Process raw user input safely.
 * @param {string} rawInput
 * @param {object} context - { architecture, runnerState, netrunner, isGM }
 * @returns {CommandResult}
 */
export function processInput(rawInput, context = {}) {
  const tokens = tokenize(rawInput);

  if (tokens.length === 0) {
    return {
      success: false,
      message: 'EMPTY COMMAND. Type HELP for list.',
      type: 'error',
    };
  }

  const verb = tokens[0];
  const args = tokens.slice(1);
  const def = ALIAS_MAP.get(verb);

  if (!def) {
    return {
      success: false,
      message: `UNKNOWN COMMAND: "${verb}". Type HELP.`,
      type: 'error',
    };
  }

  if (def.minArgs && args.length < def.minArgs) {
    return {
      success: false,
      message: `${def.key} requires arguments. Example: ${def.aliases[0].toUpperCase()} 1`,
      type: 'error',
      action: def.action,
      args,
    };
  }

  // Built-in help (no game state needed)
  if (def.action === 'help') {
    const lines = Object.values(COMMANDS).map(
      (c) => `  ${c.aliases[0].toUpperCase().padEnd(12)} — ${c.description}`
    );
    return {
      success: true,
      message: 'AVAILABLE COMMANDS:\n' + lines.join('\n'),
      type: 'info',
      action: 'help',
    };
  }

  // Status is safe and always available during a run
  if (def.action === 'status') {
    const run = context.runnerState;
    if (!run) {
      return { success: false, message: 'NO ACTIVE RUN', type: 'error' };
    }
    const floor = run.architecture?.floors?.[run.currentFloorIndex];
    return {
      success: true,
      message: [
        `NETRUNNER: ${run.netrunner?.name || 'UNKNOWN'}`,
        `INTERFACE: ${run.netrunner?.interface ?? '?'}`,
        `FLOOR: ${run.currentFloorIndex} (${floor?.label || floor?.type || '?'})`,
        `THREAT: ${run.threat || 'LOW'}`,
        `CLOAKED: ${run.cloaked ? 'YES' : 'NO'}`,
        `MODE: ${(run.mode || 'standard').toUpperCase()}`,
      ].join('\n'),
      type: 'info',
      action: 'status',
    };
  }

  // All other actions are returned to the runner for resolution
  // (DV rolls, ICE combat etc. happen in runner / later phases)
  return {
    success: true,
    message: `COMMAND ACCEPTED: ${def.key}${args.length ? ' ' + args.join(' ') : ''}`,
    type: 'info',
    action: def.action,
    args,
  };
}

/**
 * List all command definitions (for UI / docs)
 */
export function listCommands() {
  return Object.values(COMMANDS).map((c) => ({
    name: c.aliases[0].toUpperCase(),
    aliases: c.aliases,
    description: c.description,
  }));
}

/**
 * Check if a string is a known verb (for autocomplete later)
 */
export function isKnownVerb(word) {
  return ALIAS_MAP.has(String(word || '').toLowerCase());
}
