# 🚨 Migration à appliquer côté Supabase

Date : 2026-05-24

## Pourquoi

La table `betting_markets` qui sert au dashboard prime-core **n'existe pas
dans Supabase**. Elle existait en SQLite (legacy `core-db/schema.sql`) mais
n'a jamais été portée. Conséquence visible : `prime-core.app/prime-core/dashboard`
affiche 0 marchés en permanence, malgré que la page charge sans erreur.

Sans cette migration : aucun pari prédictif n'est possible, dashboard vide,
leaderboard vide, scout vide.

## Le fichier à exécuter

`art-core/supabase/migrations/20260524000000_prime_core_betting_markets.sql`

Ce fichier :
- Crée la table `betting_markets` (Postgres, RLS activée avec lecture publique)
- Étend `bets` avec les colonnes prédictives (market_id, position, etc.) sans
  casser le schéma auction existant (les colonnes auction-specific deviennent
  nullable)
- Seed automatiquement 2 marchés de démo sur l'œuvre la plus récente si elle
  existe

## 3 façons de l'appliquer (choisis-en une)

### Méthode 1 — Dashboard Supabase (la plus simple, 2 min)

1. Va sur https://supabase.com/dashboard/project/kmmlwuwsahtzgzztcdaj/sql/new
2. Ouvre le fichier `art-core/supabase/migrations/20260524000000_prime_core_betting_markets.sql`
3. Copie tout son contenu
4. Colle dans le SQL Editor
5. Clique **Run**
6. Vérifie le panneau de droite : pas de rouge = OK

### Méthode 2 — Supabase CLI (si tu l'as installée localement)

```bash
cd art-core
supabase db push
# ou directement :
psql "$DATABASE_URL" -f art-core/supabase/migrations/20260524000000_prime_core_betting_markets.sql
```

### Méthode 3 — Vercel build hook (auto)

Si la chaîne CI du projet inclut `supabase db push` automatiquement à chaque
déploiement (à vérifier dans le `package.json` ou les hooks Vercel), un push
sur main suffit. Si non, choisir méthode 1 ou 2.

## Vérification après application

Sur le dashboard Supabase :
- Database → Tables → `betting_markets` doit apparaître avec 0 ou 2 lignes
- Database → Tables → `bets` doit avoir les nouvelles colonnes : `market_id`,
  `user_id`, `position`, etc.

Sur les sites prod :
- https://prime-core.app/prime-core/dashboard doit afficher des marchés
- https://prime-core.app/api/markets doit renvoyer un JSON avec un tableau non vide

Workflow GitHub Actions :
- https://github.com/captainpglg-hue/art-core/actions/workflows/smoke-tests.yml → **Run workflow**
- Les tests `data-flow.spec.ts` doivent passer (3 tests sur prime-core qui
  échouent actuellement)

## Effets de bord à vérifier

- Aucun, la migration est idempotente (`IF NOT EXISTS`, `IF NOT EXISTS` partout,
  `DROP POLICY IF EXISTS` avant re-create, `ON CONFLICT DO NOTHING` pour le seed)
- La table `bets` est étendue de manière non-destructive (les colonnes auction
  existantes restent, les nouvelles sont nullable)

## Si jamais ça casse en prod après application

Rollback : juste supprimer la table betting_markets (les colonnes ajoutées à
bets ne gênent personne) :

```sql
DROP TABLE IF EXISTS public.betting_markets CASCADE;
ALTER TABLE public.bets
  DROP COLUMN IF EXISTS market_id,
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS odds_at_bet,
  DROP COLUMN IF EXISTS potential_payout,
  DROP COLUMN IF EXISTS result,
  DROP COLUMN IF EXISTS payout,
  DROP COLUMN IF EXISTS placed_at;
ALTER TABLE public.bets ALTER COLUMN auction_id SET NOT NULL;
ALTER TABLE public.bets ALTER COLUMN bidder_id  SET NOT NULL;
```

## Pourquoi ce trou n'a pas été détecté plus tôt

Les smoke tests précédents (Playwright) vérifiaient que la page charge sans
500 et que le `<title>` est correct — mais pas que les données apparaissent.
Une page de dashboard servant un empty state passait ces tests.

Le nouveau fichier `tests/smoke/data-flow.spec.ts` corrige ce trou : il vérifie
que `/api/markets` retourne au moins 1 marché, que la boutique art-core affiche
au moins 1 œuvre, etc. Ces tests vont rouge tant que la migration n'est pas
appliquée — c'est volontaire (signal explicite plutôt que faux positif).
