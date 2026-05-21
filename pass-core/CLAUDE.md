# PASS-CORE — Contexte Claude Code

> ⚠️ LIS CE FICHIER EN ENTIER avant de modifier quoi que ce soit.

## État du projet — Mis à jour le 20 mai 2026

- **Build** : ✅ 0 erreur TypeScript, 32 routes
- **Pages** : 10 écrans + 24 API routes (voir Architecture)
- **Avancement** : 90%
- **Production** : `pass-core.app` (déploiement via `npx vercel --prod` uniquement)

## Architecture

```
pass-core/
├── app/
│   ├── page.tsx                          → Page d'accueil
│   ├── layout.tsx                        → Layout principal
│   ├── auth/
│   │   ├── callback/route.ts             → Callback Supabase Auth (Google)
│   │   ├── login/page.tsx                → Login custom (cookie core_session)
│   │   └── signup/page.tsx               → Inscription
│   ├── pass-core/
│   │   ├── page.tsx                      → Home pass-core
│   │   ├── certifier/page.tsx            → Formulaire de certification
│   │   ├── verifier/page.tsx             → Vérification d'un certificat
│   │   ├── gallery/page.tsx              → Galerie des œuvres certifiées
│   │   ├── deposer/page.tsx              → Dépôt (parcours antiquaire)
│   │   ├── admin/page.tsx                → Console admin
│   │   ├── admin/login/page.tsx          → Login admin (code à usage unique)
│   │   └── pro/inscription/page.tsx      → Inscription pro
│   └── api/
│       ├── admin/
│       │   ├── artworks/route.ts         → Liste artworks (admin)
│       │   ├── auth/{logout,me,request-code,verify-code}/route.ts
│       │   ├── certifications/route.ts   → Liste certifications
│       │   ├── export/route.ts           → Export CSV
│       │   ├── stats/route.ts            → KPIs admin
│       │   └── users/route.ts            → Liste users
│       ├── auth/{login,logout,me,signup}/route.ts
│       ├── blockchain/status/route.ts    → Statut blockchain Polygon (sim/réel)
│       ├── certify/route.ts              → API certification (SHA-256 + pHash)
│       ├── deposit-with-signup/route.ts  → Dépôt + signup en 1 appel
│       ├── ai-describe/route.ts          → Description IA (Anthropic)
│       ├── analyze-photo/route.ts        → Analyse photo IA
│       ├── fingerprint/route.ts          → API empreinte digitale
│       ├── fingerprint/compare/route.ts  → Comparaison d'empreintes
│       ├── health/route.ts               → /api/health (ping DB)
│       ├── upload-photo/route.ts         → Upload photo (Cloudinary)
│       └── verify/route.ts               → API vérification
├── components/
│   ├── pass-core/PassNavbar.tsx          → Navigation
│   ├── shared/PWAInstaller.tsx           → Installation PWA
│   └── ui/                               → Composants shadcn/ui
├── lib/
│   ├── blockchain.ts                     → Client blockchain (viem/Polygon)
│   ├── db.ts                             → Client DB : postgres-js + fallback Supabase REST
│   ├── fingerprint.ts                    → Calcul empreinte SHA-256 + pHash
│   ├── mailer.ts                         → Envoi emails (Resend)
│   ├── supabase-storage.ts               → Upload photos Supabase Storage
│   └── utils.ts                          → Utilitaires
└── public/                               → Assets statiques
```

## Stack technique

- Next.js 14.2.5 + TypeScript
- **Supabase Postgres** (via `postgres` + `@supabase/supabase-js`) — partage la base
  `kmmlwuwsahtzgzztcdaj` avec art-core et prime-core
- Cloudinary (images)
- Anthropic SDK (IA description)
- viem (blockchain Polygon, mode simulation par défaut)
- sharp (traitement images)
- Tailwind CSS + shadcn/ui

`lib/db.ts` expose : `query` / `queryOne` / `queryAll` (avec fallback automatique
postgres-js → Supabase REST), `getUserByEmail`, `getUserById`, `getUserByToken`,
`getArtworkById`, `getArtworks`, `getCertifiedArtworksWithArtists`,
`getGaugeEntries`, `pingDb`, `getDb` (client Supabase admin).
Le translator REST (`sqlViaRest`) ne supporte PAS les JOINs ni les GROUP BY :
pour les requêtes multi-tables, utiliser le pattern restSelect + enrichissement
séparé (voir `getCertifiedArtworksWithArtists`).

## Commandes

```bash
npm run dev        # Dev sur http://localhost:3001 (port 3001 !)
npm run build      # Build production
npm run typecheck  # Vérification TypeScript seule
npx vercel --prod  # Déployer sur Vercel (CLI uniquement, PAS de Git deploy)
```

## Variables d'environnement requises (.env.local)

Variables nécessaires (les valeurs sont partagées avec art-core/.env.local pour
Supabase, Stripe, Cloudinary, Anthropic) :

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (postgres pooler Supabase) — **indispensable** pour les pages
  qui dépendent de JOINs en SSR (sinon fallback REST déclenche un empty state)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`
- `ANTHROPIC_API_KEY`
- `BLOCKCHAIN_*` (mode simulation pour l'instant)
- `NEXT_PUBLIC_APP_URL=http://localhost:3001`

## Déploiement

- **Projet Vercel dédié** : `pass-core-final` (équipe `captainpglg-hues-projects`)
- **Root Directory** : `pass-core` (le sous-dossier de ce repo)
- **Domaine** : pass-core.app
- **Auto-deploy** : push sur `main` du repo `captainpglg-hue/art-core` déclenche un build (sprint kill-switch en cours).

## Ce qui reste à faire

1. Brancher la blockchain Polygon en mode réel (actuellement simulation)
2. Ajouter le micro/dictée vocale dans le formulaire certifier
3. Page DepartMer dans la navigation (si toujours pertinent)

## Design

- Dark navy #0A1128 + Or #D4AF37
- Style Christie's (luxe sobre)
- Mobile-first, responsive
- "Certifié ✅" visible, zéro jargon blockchain

## Relation avec les autres apps

- **art-core** : App principale (marketplace) sur port 3000. Contient aussi une
  route /pass-core/certifier dans son architecture.
- **prime-core** : App paris/investissement sur port 3002
- Les 3 apps partagent la même base Supabase et les mêmes clés Stripe/Cloudinary
