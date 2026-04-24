# 2026-04-23 — Migration prime-core → Supabase Postgres

## Contexte

prime-core était resté sur `better-sqlite3` pointant vers `../core-db/core.db`,
alors qu'art-core et pass-core avaient migré vers Supabase Postgres dès le
14 avril 2026. En prod Vercel serverless, ce code crashait systématiquement :

- le FS est read-only → impossible d'ouvrir une DB en écriture locale,
- pas de binaire natif SQLite disponible dans le runtime serverless,
- et même si c'était le cas, `../core-db/core.db` n'est pas déployé.

Donc toutes les pages et routes prime-core étaient effectivement cassées en prod.

## Ce qui a été fait (résumé)

| Fichier | Avant | Après |
|---------|-------|-------|
| `prime-core/lib/db.ts` | sync `better-sqlite3` avec 4 helpers simples | async postgres-js + fallback REST, ~15 helpers incluant `getMarkets/getMarketById/getBetsForMarket/getScouts/getLeaderboard/getScoutStats/getTotalBetsCount`, `cache: "no-store"` sur le REST |
| `prime-core/package.json` | `better-sqlite3` + `@types/better-sqlite3` | `postgres` ^3.4.9 à la place ; `@supabase/supabase-js` et `@supabase/ssr` déjà présents conservés |
| `prime-core/app/prime-core/dashboard/page.tsx` | sync `getMarkets()` + `getDb().prepare(...).get()` | async `await getMarkets()` + `await getTotalBetsCount()` |
| `prime-core/app/prime-core/leaderboard/page.tsx` | deux gros prepare+all locaux | `await getLeaderboard()` qui renvoie `{ topBettors, topInitiates }` |
| `prime-core/app/prime-core/scout/page.tsx` | 10+ requêtes SQLite inline avec id hardcodé `usr_initie_2` | `await getScoutStats("usr_initie_2")` + garde-fou `safeUser` (id legacy ne matche plus) |
| `prime-core/app/prime-core/market/[id]/page.tsx` | `getMarketById(id)` / `getBetsForMarket(id)` sync | `await`-és ; casts `Number()` ajoutés pour les `numeric` Supabase (string en JS) |
| `prime-core/app/api/markets/route.ts` | sync | `await getMarkets()` + `export const dynamic = "force-dynamic"` |
| `prime-core/app/api/bet/route.ts` | 6 prepare/run avec id manuel `bet_${Date.now()}_...` | helpers async `queryOne` / `query`, id bet auto-généré par Supabase (uuid), pattern `col = col + ?` remplacé par read+write |
| `prime-core/CLAUDE.md` | mention `better-sqlite3` | mention Supabase + nouvel état async |
| `prime-core/CHANGELOG.md` | entrée "prime-core est le retardataire de la migration" | nouvelle section 2026-04-23 détaillée |

## Pourquoi

- Uniformiser la stack DB des 3 apps du monorepo (toutes sur Supabase).
- Débloquer les déploiements Vercel prod de prime-core.
- Éviter le piège du caching server-side Next.js sur les lectures DB (découverte du jour sur art-core).

## Fichiers archivés ici

- `lib_db.ts.before.bak` — ancien `lib/db.ts` SQLite (51 lignes)
- `package.json.before.bak` — ancien `package.json` avec `better-sqlite3`
- `api_bet_route.ts.before.bak` — ancienne route `/api/bet` avec 6 `db.prepare()`
- `api_markets_route.ts.before.bak` — ancienne route `/api/markets` sync
- `market_id_page.tsx.before.bak` — ancienne page détail marché sync
- `dashboard_page.tsx.before.bak` — ancien dashboard sync
- `scout_page.tsx.before.bak` — ancien scout dashboard avec 10+ prepare inline
- `leaderboard_page.tsx.before.bak` — ancien leaderboard sync avec 2 gros JOINs
- `CLAUDE.md.before.bak` — ancien `CLAUDE.md` qui ne mentionnait pas Supabase

## Points de vigilance post-déploiement

1. **Vérifier les variables d'env Vercel** pour prime-core : `DATABASE_URL` (pooler Supabase), `SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`. Si elles sont scopées au projet art-core mais pas à prime-core, le build passera mais l'app crashera au runtime.
2. **Page `/prime-core/scout`** : l'id demo hardcodé `usr_initie_2` ne matche plus aucun user en Supabase (uuids). La page s'affiche avec les placeholders (points_balance=0, total_earned=0). À remplacer par une vraie session user quand l'auth sera branchée côté prime-core.
3. **Translator SQL → REST** (fallback) ne supporte pas les GROUP BY / JOINs / `col = col + ?`. Si postgres-js est KO (auth rotée etc.), le leaderboard `topBettors` sera vide (le code dégrade gracieusement au lieu de crasher).
4. **ID des bets et point_transactions** : auparavant des strings custom `bet_${Date.now()}_...`, maintenant des uuids auto-générés Supabase. Si d'anciennes lignes SQLite avaient été seedées avec l'ancien format, elles coexistent mais l'API ne les génère plus.
5. **Pas de `npm install` dans ce sandbox** — `package-lock.json` sera régénéré côté Vercel au build. Le lockfile a été vidé (réduit au skeleton `{ packages: {} }`) pour forcer Vercel à faire un `npm install` propre plutôt qu'un `npm ci` qui détecterait l'incohérence `better-sqlite3` (ex-lockfile) vs absent (ex-package.json).
6. **`next.config.mjs`** : `serverComponentsExternalPackages: ["better-sqlite3"]` retiré (devenu `[]`). `postgres` est pur JS, pas besoin de l'externaliser.

## À faire côté Philippe (PowerShell Windows)

Depuis `C:\Users\Gigon Le Grain\Desktop\art-core` :

```powershell
git add prime-core archives/2026-04-23_prime-core-supabase-migration
git status  # vérifier que seuls prime-core/** et l'archive sont staged
git commit -m "feat(prime-core): migrate from better-sqlite3 to Supabase Postgres"
git push   # origin main — PAS pour deployer, juste sauvegarder sur GitHub
npx vercel --prod  # CLI uniquement, jamais via git push — règle écosystème
```
