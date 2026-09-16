# NIGHTNET // Night City Service Network

**Interactive cyberpunk urban service portal**  
Feel like you just jacked into a restricted Night City corporate/underground network terminal.

## Live Demo

**https://neonkotick.github.io/nightnet/**

(If the link shows 404 — wait 1–2 minutes after the first deploy or go to repository Settings → Pages and make sure source is set to GitHub Actions.)

## Concept

NIGHTNET is a fully interactive entertainment site that simulates ordering black-market and corporate services in a futuristic megacity.  
No real payments. Pure atmosphere + demo interaction.

## Features

- **Service Catalog** — 24+ services across Medical, Security, Mercenary, Netrunner, Transport, Underground, Information
- **Filtering & Search** — by category, price, risk, rating, response time
- **Service Details Modal** — with glitch, scan effects, request flow
- **Digital Wallet** — Eurodollars balance, spend on services, transaction history
- **User Profile** — reputation, completed contracts, district, status
- **City Events** — dynamic random alerts with response options
- **News Feed** — live-feeling Night City headlines
- **Advertisements** — ambient corporate & street ads
- **District Map** — stylized interactive districts
- **Easter Eggs** — Konami-style, secret terminal, hidden service
- **Sound Architecture** — ready for SFX (click, alert, confirm, glitch)
- **Responsive** — desktop / tablet / mobile
- **Accessibility** — keyboard, reduced-motion, ARIA, contrast

## Tech Stack

- Vanilla HTML / CSS / JS (ES modules)
- No framework bloat
- CSS custom properties for neon theme
- LocalStorage for wallet & profile persistence
- Pure data-driven services

## Quick Start

```bash
git clone https://github.com/Neonkotick/nightnet.git
cd nightnet
npx serve .
```

Or just open the live link above.

## Architecture

```
/
├── index.html          # Entry + terminal shell
├── css/
│   └── main.css        # Neon theme, HUD, animations, responsive
├── js/
│   ├── main.js         # App bootstrap
│   ├── data/
│   │   └── services.js # Configurable service database
│   ├── state/
│   │   └── store.js    # Wallet, user, transactions, events
│   └── utils/
│       └── sound.js    # Sound architecture (stub)
└── .github/workflows/
    └── deploy-pages.yml
```

## License

MIT — free to fork and expand.

---

**STATUS: ONLINE**  
**DISTRICT: NIGHT CITY**  
**SYSTEM: OPERATIONAL**
