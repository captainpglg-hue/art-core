---
name: Core Ecosystem Local Build (2026-03-20)
description: Full local rebuild of 3 interconnected apps with shared SQLite database - completed state and next steps
type: project
---

## Completed on 2026-03-20: Full Local Rebuild

All 3 apps rebuilt to run 100% locally with shared SQLite database (no Supabase).

### Architecture
- **Shared DB**: `C:\Users\User\core-db\core.db` (SQLite via better-sqlite3)
- **DB init script**: `C:\Users\User\core-db\init.js` (run `node init.js` to reset)
- **ART-CORE**: `C:\Users\User\art-core` — port 3000
- **PASS-CORE**: `C:\Users\User\pass-core` — port 3001
- **PRIME-CORE**: `C:\Users\User\prime-core` — port 3002

### Auth System
- Cookie-based (`core_session`) with bcrypt + crypto tokens
- API routes: `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/me`
- Middleware in art-core protects routes, redirects to `/auth/login`

### Demo Accounts (password: password123)
- artist@demo.com (Marie Dubois) — artiste
- artist2@demo.com (Lucas Martin) — artiste
- initie@demo.com (Sophie Laurent) — initié, 45 pts
- initie2@demo.com (Thomas Bernard) — initié, 60 pts
- client@demo.com (Jean Dupont) — client
- admin@artcore.com — admin

### Key Features Working
- Gauge system (deposit, lock at 100, artist empty)
- Sale flow with automatic commission distribution to initiés
- Automatic betting market resolution on sale
- PASS-CORE certification creates artwork + betting markets in shared DB
- Promo shop (boost, highlight, badge, search priority, featured)
- Messaging, favorites, notifications, wallet/point history
- Profiles, dashboard, orders

### Data Flow
PASS-CORE certifies → creates artwork in DB (gauge=0) + creates betting markets
ART-CORE displays → initiés fill gauge → clients buy
Sale confirmed → commissions distributed → bets resolved → PRIME-CORE updated

### What Remains To Do
- Real image upload (currently Unsplash demo URLs)
- Admin panel
- Stripe Connect (real payments)
- Real partner bank account flow
- Real blockchain (currently simulated SHA-256)
- Mobile (Expo/React Native)
- Shared SSO across all 3 apps
- Logos and visual assets
- WebSocket for real-time notifications

**Why:** User wants fully local ecosystem before connecting external services.
**How to apply:** When resuming work, start dev servers on ports 3000/3001/3002 and run `node init.js` in core-db if DB needs reset.
