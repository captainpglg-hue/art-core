# PRIME-CORE — Contexte Claude Code

> ⚠️ LIS CE FICHIER EN ENTIER avant de modifier quoi que ce soit.

## État du projet — Mis à jour le 20 mai 2026

- **Build** : ✅ 0 erreur TypeScript, 7 routes (dashboard, leaderboard, scout, market/[id], home, +2 API)
- **Avancement** : 90%
- **Production** : prime-core.app (redéploiement à valider via `npx vercel --prod`)

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
- **Résilience** : depuis le 20 mai, chaque fonction business (`getMarkets`,
  `getMarketById`, `getBetsForMarket`, `getUserByToken`, `getUserById`,
  `getScouts`) catche un éventuel double-échec (REST 403 + JOIN non supporté
  par le translator REST) et renvoie une valeur safe (`[]` / `undefined`).
  Les pages SSR rendent donc un empty state au lieu de 500. Pour avoir
  un rendu complet, fournir `DATABASE_URL` (postgres pooler Supabase) ET/OU
  allowlister l'IP de l'environnement dans Supabase Network Restrictions.

## Design

- Dark navy #0A1128 + Or #D4AF37 (identique art-core et pass-core)

## Déploiement

- **Projet Vercel dédié** : `prime-core-final` (équipe `captainpglg-hues-projects`)
- **Root Directory** : `prime-core` (le sous-dossier de ce repo)
- **Domaine** : prime-core.app
- **Auto-deploy** : push sur `main` du repo `captainpglg-hue/art-core` déclenche un build.
- Variables d'env requises en prod : `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL=https://prime-core.app`

## Relation avec les autres apps

- Partage la même base Supabase, mêmes clés Stripe/Cloudinary
- `art-core/` = app principale (port 3000)
- `pass-core/` = certification (port 3001)
