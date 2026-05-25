# Migration à appliquer manuellement — 25 mai 2026

## Fichier
`art-core/supabase/migrations/20260525000000_betting_markets_moderation.sql`

## Ce qu'elle fait
Ajoute la modération des marchés user-generated de prime-core :
- `betting_markets.moderation_status` ('pending' | 'approved' | 'rejected'), default 'approved'
- `betting_markets.proposed_by` (UUID du proposant, nullable)

Les marchés existants restent visibles (default 'approved').

## Procédures

### 1. Dashboard Supabase (recommandé)
1. https://supabase.com/dashboard/project/kmmlwuwsahtzgzztcdaj/sql/new
2. Coller le contenu du fichier `.sql`
3. **Run**

### 2. CLI
```bash
cd art-core
npx supabase db push --linked
```

### 3. psql direct
```bash
psql "$DATABASE_URL" -f art-core/supabase/migrations/20260525000000_betting_markets_moderation.sql
```

## Vérification post-migration
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'betting_markets'
  AND column_name IN ('moderation_status', 'proposed_by');
```
Attendu : 2 lignes.

## Tant que la migration n'est pas appliquée
Le code applicatif gère les deux états :
- Colonne absente → tous les marchés sont considérés `approved` (filtre JS-side
  permissif).
- POST /api/markets renverra 500 sur l'INSERT du `moderation_status`. À tester
  uniquement après migration.

Une fois la migration appliquée, la page `/prime-core/markets/new` peut être
utilisée et la modération via `/prime-core/admin/markets/moderation`.
