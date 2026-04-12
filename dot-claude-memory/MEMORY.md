# Memory — Core Ecosystem (Art)

## Project: Core Ecosystem
Three interconnected apps for the art market, sharing a single LOCAL SQLite database.
- [Project details & design tokens](project_core_ecosystem_local.md)

### Apps & Paths
- **ART-CORE** (`C:\Users\User\art-core`) — port 3000 — Marketplace with gauge system
- **PASS-CORE** (`C:\Users\User\pass-core`) — port 3001 — Blockchain certification
- **PRIME-CORE** (`C:\Users\User\prime-core`) — port 3002 — Prediction markets
- **Shared DB** (`C:\Users\User\core-db\core.db`) — SQLite via better-sqlite3

### Stack (Current — Local)
- Next.js 14 (App Router) + TypeScript
- SQLite (better-sqlite3) — single shared DB file
- Cookie-based auth (bcrypt + crypto tokens)
- Tailwind CSS + shadcn/ui + Lucide React
- No external dependencies (no Supabase, no Stripe, no Cloudinary)

### Design Tokens
- `#121212` — ART-CORE bg | `#0A1128` — PASS-CORE bg | `#0D0F14` — PRIME-CORE bg
- `#D4AF37` — gold (primary accent all apps) | `#FFFFFF` — text

### Key Business Rules
- Pass-Core belongs to Art-core LTD, not the user/collector
- Seller: 90% | Platform: 10% | Initiés pool: 50% of platform fee (when gauge locked)
- Initié signup bonus: 15 pts (simulated partner bank account)
- Commission converted to points with 1.2x bonus coefficient
- Artist can empty gauge to recover points as promo credits
- Gauge at 100 = deal locked = guaranteed sale

### Completed Work (PROMPT 4 — Full Local Rebuild, 2026-03-20)
All 3 apps rebuilt 100% local. See [detailed state](project_core_ecosystem_local.md)

### Remaining Work
- Real image upload, admin panel, Stripe, real blockchain, mobile, SSO, logos
