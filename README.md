# NIGHTNET // Night City Service Network

**Interactive cyberpunk terminal + Cyberpunk RED tabletop RPG tool**

Feel like you just jacked into a restricted Night City network — then use it at the table for Netrunning, Trauma Team calls and GM tools.

## Live Demo

**https://neonkotick.github.io/nightnet/**

## Status

**PHASE 3 — Architecture Foundation** (in progress)

| Module              | Status        |
|---------------------|---------------|
| Service Catalog     | ✅ Complete   |
| Wallet / Profile    | ✅ Complete   |
| City Events / Map   | ✅ Complete   |
| Event Bus           | ✅ Foundation |
| Command Sandbox     | ✅ Foundation |
| Immersion Levels    | ✅ Foundation |
| Net Architecture    | 🟡 Stub       |
| Netrunning Runner   | 🟡 Stub       |
| GM Panel            | 🟡 Stub       |
| Trauma Team         | 🟡 Basic      |
| Black ICE / Combat  | ⏳ Planned    |
| Architecture Builder| ⏳ Planned    |

## Concept

NIGHTNET is evolving from an atmospheric Night City service portal into a **practical tool for Cyberpunk RED tabletop sessions**:

- Interactive **Netrunning** terminal (Jack In → navigate floors → commands)
- **GM Panel** for architectures, threat level, force events
- **Trauma Team** emergency response UI
- Immersion levels (presentation only — never changes official rules)
- Extensible service architecture

All hacking is **game simulation only**. No real network access, no eval of user code, no shell commands.

## Tech Stack

- Vanilla HTML / CSS / JS (ES modules)
- No framework bloat
- LocalStorage persistence
- GitHub Pages deploy

## Quick Start

```bash
git clone https://github.com/Neonkotick/nightnet.git
cd nightnet
npx serve .
```

Or open the live link above.

## Architecture (PHASE 3)

```
js/
├── core/
│   ├── eventBus.js          # Pub/sub
│   └── commandSandbox.js    # Safe command whitelist
├── netrunning/
│   ├── architecture.js      # Net Arch model
│   └── runner.js            # Jack in / out / commands
├── gm/
│   └── panel.js             # GM controls stub
├── ui/
│   └── immersion.js         # Immersion 1–5
├── state/store.js
├── data/services.js
└── main.js
```

## Legal / IP

Cyberpunk RED is © R. Talsorian Games.  
This is an **unofficial fan tool** for tabletop play.  
No official images or large copyrighted rule excerpts are included.  
Homebrew / optional features are clearly marked.

## License

MIT — free to fork and expand.

---

**STATUS: ONLINE**  
**DISTRICT: NIGHT CITY**  
**SYSTEM: OPERATIONAL // PHASE 3**
