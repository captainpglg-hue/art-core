# CHANGELOG — PRIME-CORE

> Journal des évolutions de l'app **prime-core** (paris / wallet / Pass Magnat).
> Format : date (AAAA-MM-JJ) → [commit] → résumé.
> Reconstruit à partir de l'historique Git le 2026-04-23.

---

## [Non publié / à faire]

- **Typecheck + build** : à relancer une fois que Vercel aura réinstallé les deps (`postgres` ajouté, `better-sqlite3` retiré).
- **État prod** : `prime-core.app` à redeployer post-migration Supabase du 23 avril.

---

## 2026-04-23 — Migration Supabase Postgres

- **Migration DB complète** : abandon de `better-sqlite3` + `../core-db/core.db` au profit de Supabase Postgres (projet `kmmlwuwsahtzgzztcdaj`), comme art-core et pass-core depuis le 14 avril.
  - Motivation : le code SQLite local crashait en prod Vercel (FS read-only, pas de binaire natif). Toutes les pages et routes étaient donc cassées côté serverless.
  - **`lib/db.ts` réécrit** en calquant le pattern `art-core/lib/db.ts` :
    - `postgres` (postgres-js) pour les requêtes SQL directes
    - Fallback PostgREST via `SUPABASE_SERVICE_ROLE_KEY` si postgres-js échoue (auth rotée, `ECONNREFUSED`…)
    - `cache: "no-store"` sur tous les `fetch` REST (sinon Next.js cache les réponses server-side à l'infini)
    - Client Supabase admin exposé via `getDb()` (bypasse RLS)
  - **Nouveaux helpers async** : `getMarkets()`, `getMarketById()`, `getBetsForMarket()`, `getUserByToken()`, `getUserById()`, `getScouts()`, `getLeaderboard()`, `getTotalBetsCount()`, `getScoutStats()`, `query` / `queryOne` / `queryAll`, `pingDb()`.
  - **Changement de schéma** : `users.name` devient `users.full_name` (Supabase), adapté dans les JOINs. Les ids `bets` et `point_transactions` deviennent auto-générés (uuid) au lieu de chaînes `bet_${Date.now()}_...`.
- **`package.json`** : retrait de `better-sqlite3` et `@types/better-sqlite3`, ajout de `postgres` ^3.4.9. `@supabase/supabase-js` et `@supabase/ssr` étaient déjà là.
- **Pages server-side migrées en async** :
  - `app/prime-core/dashboard/page.tsx` : `getMarkets()` + `getTotalBetsCount()` awaités
  - `app/prime-core/leaderboard/page.tsx` : `getLeaderboard()` awaité (retourne `{ topBettors, topInitiates }`)
  - `app/prime-core/scout/page.tsx` : `getScoutStats(userId)` awaité (agrège user, totals, rank, activité récente, topScouts) ; ajout d'un garde-fou `safeUser` car l'ancien id legacy `usr_initie_2` n'existe plus en Supabase (uuid)
  - `app/prime-core/market/[id]/page.tsx` : `getMarketById(id)` et `getBetsForMarket(id)` awaités ; casts `Number()` ajoutés car Supabase renvoie les `numeric` en string
- **API routes migrées** :
  - `app/api/markets/route.ts` : `getMarkets()` awaité, ajout `export const dynamic = "force-dynamic"`
  - `app/api/bet/route.ts` : suppression des `db.prepare().get/.all/.run`, remplacement par `queryOne` / `query` ; patch de l'INSERT pour ne plus fournir d'id manuel (laisse Supabase générer l'uuid via `DEFAULT gen_random_uuid()`) ; le pattern `col = col + ?` SQL n'est plus supporté par le translator REST donc on lit + réécrit la valeur.
- **Archivage** : snapshots des fichiers "avant" dans `archives/2026-04-23_prime-core-supabase-migration/` avec un CHANGELOG détaillé.

### Limites connues post-migration

1. La page `/prime-core/scout` a un id demo hardcodé `usr_initie_2` qui ne matchera plus aucun user Supabase → elle s'affichera avec les placeholders `safeUser` jusqu'à ce qu'une vraie auth session soit branchée.
2. Les agrégations complexes du leaderboard (GROUP BY + SUM) nécessitent postgres-js direct ; si seul le fallback REST est dispo, `topBettors` sera vide.
3. Le translator SQL → REST ne supporte pas les JOINs ni les expressions comme `col = col + ?` — les rares endroits concernés ont été réécrits en 2 requêtes (select puis update).

---

## 2026-04-22

- `d67e358` chore : normalisation globale des fins de ligne (application rétroactive de `.gitattributes`).

## 2026-04-11

- `7928d33` fix : normalisation de l'encodage + mise à jour de l'app prime-core.
- `929d71a` fix : ignorer les erreurs TypeScript / ESLint pendant les builds Vercel.

## 2026-04-10

- `7aff6f5` fix : corrections accents FR, nouveaux rôles vendeurs, liens env vars.

## 2026-04-08

- `e7e31ad` reorganize : unification de toutes les apps depuis les sources `*-final`, fix `ArtworkCard use client`.

## 2026-03-22

- `694c976` full backup — art-core, pass-core, prime-core, core-db.

---

## ⚠️ Observations

1. **Peu d'activité récente** — 6 commits sur 1 mois. La plupart sont des corrections transverses qui ont touché prime-core « en passant » lors de réorgs globales.
2. **Aucun feat spécifique prime-core** depuis le backup du 22 mars. Le module paris / wallet / Pass Magnat n'a probablement pas évolué depuis la réorg du 8 avril.
3. **Action recommandée** : avant d'aller plus loin, lancer `npm run typecheck` + `npm run build` depuis `prime-core/` pour confirmer que l'app compile encore, puis décider si on migre à Supabase Postgres (cohérence écosystème) ou si on laisse SQLite temporairement.
