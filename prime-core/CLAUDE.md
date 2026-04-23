# PRIME-CORE — Contexte Claude Code

> ⚠️ LIS CE FICHIER EN ENTIER avant de modifier quoi que ce soit.

## État du projet — Mis à jour le 23 avril 2026

- **Build** : à rebuilder (migration Supabase du 23 avril, voir CHANGELOG)
- **Avancement** : 90%
- **Production** : prime-core.app (redeploy requis post-migration)

## Ce que fait Prime-Core

Prime-Core est la plateforme de paris/investissement de l'écosystème Art-Core :
- Wallet utilisateur
- Leaderboard anonyme
- Liens d'affiliation
- Pass Magnat (abonnement premium 9,90€/mois)

## Commandes

```bash
npm run dev        # Dev sur http://localhost:3002 (port 3002 !)
npm run build      # Build production
npm run typecheck  # Vérification TypeScript
npx vercel --prod  # Déployer (CLI uniquement, depuis art-core/ racine)
```

## Stack

- Next.js 14.2.5 + TypeScript + **Supabase Postgres** (via `postgres` + `@supabase/supabase-js`) + Stripe + Tailwind + shadcn/ui
- Depuis le 23 avril 2026, prime-core utilise la même base Supabase `kmmlwuwsahtzgzztcdaj` que art-core et pass-core (fin du `better-sqlite3` local).
- `lib/db.ts` expose : `getMarkets()`, `getMarketById(id)`, `getBetsForMarket(marketId)`, `getUserByToken(token)`, `getUserById(id)`, `getScouts()`, `getLeaderboard()`, `getTotalBetsCount()`, `getScoutStats(userId)`, plus les helpers bas niveau `query` / `queryOne` / `queryAll` / `getDb()` (Supabase admin). **Toutes ces fonctions sont async** — les pages doivent les awaiter.
- Fallback REST (PostgREST) si postgres-js échoue sur l'auth ; `cache: "no-store"` activé sur tous les `fetch` REST pour éviter que Next.js ne cache indéfiniment les réponses server-side.

## Design

- Dark navy #0A1128 + Or #D4AF37 (identique art-core et pass-core)

## Déploiement

- Même projet Vercel que art-core et pass-core
- Domaine : prime-core.app
- CLI uniquement, PAS de Git deploy
- Variables d'env requises en prod : `DATABASE_URL`, `SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`

## Relation avec les autres apps

- Partage la même base Supabase, mêmes clés Stripe/Cloudinary
- art-core-final = app principale (port 3000)
- pass-core-final = certification (port 3001)
