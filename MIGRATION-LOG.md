# MIGRATION-LOG — 2026-04-14

## Résumé exécutif

Migration SQLite → Supabase Postgres **commit + push effectués**, mais **avec une adaptation critique en cours de route**. Signup/login devraient fonctionner après redéploiement Vercel. Le reste de l'app (admin, artworks, cahier de police, etc.) est **cassé** par un mismatch de schéma détecté en prod et nécessite un travail de suivi.

## Ce qui a été fait en autonomie

### Code (committé + pushé sur `origin/main`)

- Commit `a7304c2` : remplacement de `better-sqlite3` par `postgres` dans `art-core/` et `pass-core/`.
- Nouveau `lib/db.ts` async (clients `postgres` + helpers `query` / `queryOne` / `queryAll` + helpers métier).
- 34 routes API patchées dans `art-core/app/api/` + 9 dans `pass-core/app/api/admin/`.
- 4 routes pass-core spécifiques converties à la main (admin/artworks, fingerprint, fingerprint/compare, verify).
- 5 server components art-core + 1 pass-core (gallery) convertis en async.
- `public/sw.js` bumpé v1 → v2 dans les 2 apps.
- Rebase propre sur `origin/main` (conflit fingerprint.ts résolu en faveur du remote).

### Probes Supabase (via SUPABASE_SERVICE_ROLE_KEY + REST API)

| Table | État | Count |
|---|---|---|
| users | ✅ existe | 110 |
| sessions | ✅ existe | 96 |
| artworks | ✅ existe | 259 |
| transactions | ✅ existe | 4 |
| gauge_entries | ✅ existe | 4 |
| notifications | ✅ existe | 30 |
| messages | ✅ existe | 1 |
| favorites | ✅ existe | 0 |
| admin_codes | ❌ **n'existe pas** | — |
| cahier_police | ❌ **n'existe pas** | — |

### Vercel (art-core-final)

- `vercel whoami` = `captainpglg-hue` → déjà loggé.
- `DATABASE_URL` est **déjà configurée** côté Vercel (`production + preview + development`, créée il y a 6 jours). Je n'ai **pas** eu besoin de la resetter.
- Valeur récupérée via `vercel env pull` : `postgresql://postgres:…@[ipv6]:5432/postgres` (connexion **directe**, port 5432, pas le pooler 6543). Ne posera pas de problème avec `prepare: false` mais en cas de cold-start massif il faudra basculer sur le pooler `aws-0-eu-west-3.pooler.supabase.com:6543`.
- **Le fichier `.env.vercel.production` a été supprimé** après lecture (il contient le mot de passe en clair).

## ⚠️ Découvertes bloquantes

### 1. Mismatch de schéma massif entre le code et la DB prod

Le schéma réel (live depuis ~6 jours, 110 users actifs) **ne correspond pas** à `supabase-schema.sql` ni aux colonnes utilisées par les routes patchées.

| Code attend | DB réelle |
|---|---|
| `users.name TEXT` | `users.full_name TEXT` |
| `users.id TEXT` (format `usr_...`) | `users.id UUID` |
| `users.is_initie INTEGER (0/1)` | `users.is_initie BOOLEAN` |
| `point_transactions` | Table absente |
| `admin_codes` | Table absente |
| `cahier_police` | Table absente |
| `artworks.photos TEXT (JSON)` | `artworks.image_url + additional_images TEXT[]` |
| `artworks.buyer_id` | `artworks.owner_id` |
| `artworks.gauge_points` | Absent |
| `artworks.blockchain_hash` | Absent (remplacé par `pass_core_id`) |

**Conséquence immédiate** : **toutes les routes autres que auth sont cassées** contre cette DB (INSERT/SELECT avec colonnes inexistantes → 500).

**`supabase-schema.sql` N'A PAS ÉTÉ EXÉCUTÉ**. Le faire effacerait 110 users + 259 artworks + 96 sessions réels. Décision **à toi** : soit on droppe tout et on rebase sur le schéma du code, soit on réécrit le code pour coller à la DB existante.

### 2. Récupération du DB password via Service Role

L'instruction demandait d'utiliser `SUPABASE_SERVICE_ROLE_KEY` pour extraire le password DB via Management API. **Pas faisable** : la Management API (`api.supabase.com/v1/projects/.../database`) exige un **Personal Access Token** (PAT), pas un service_role. Le service_role ne donne accès qu'à PostgREST/Auth/Storage du projet, pas à ses credentials de connexion.

Heureusement inutile au final, car `DATABASE_URL` était **déjà configuré** sur Vercel.

## Adaptation d'urgence (2e commit — pas encore committé au moment où j'écris)

Pour que **signup + login** fonctionnent en prod malgré le mismatch :

- `lib/db.ts` (art-core + pass-core) : `getUserByEmail` / `getUserById` / `getUserByToken` renvoient `full_name AS name` (alias en sortie) pour que les routes qui lisent `user.name` continuent de fonctionner.
- `createSession` : retire l'ID explicite et utilise `RETURNING id` (la table sessions a un `id UUID DEFAULT gen_random_uuid()`).
- `auth/signup/route.ts` :
  - `crypto.randomUUID()` au lieu de `usr_${Date.now()}_...` (colonne `id UUID`).
  - `INSERT ... full_name ...` au lieu de `name`.
  - `is_initie` boolean (`true`/`false`) au lieu d'un entier 0/1.
  - Bloc `point_transactions` retiré (table absente).
- `auth/login` + `auth/me` : `user.name || user.full_name` en sortie.

Routes **non corrigées** (qui 500-eront encore après déploiement) : toutes les autres routes d'art-core et pass-core, en particulier :
- `/api/artworks` (colonnes `photos`, `gauge_points`, `blockchain_hash` absentes)
- `/api/cahier-police` (table absente)
- `/api/admin/*` (colonnes différentes)
- `/api/gauge/*`, `/api/certify`, `/api/certification`, `/api/boost`, etc.

## Étapes restantes (à faire manuellement quand tu rentres)

1. **Décider** du schéma cible :
   - Option A — **Destructrice** : exécuter `supabase-schema.sql` qui `DROP` implicitement les tables via `CREATE TABLE IF NOT EXISTS` (non, `IF NOT EXISTS` ne drop pas, donc les tables existantes seraient gardées mais INSERT seed users échouerait sur colonnes manquantes). Pour vraiment repartir à zéro, précéder chaque `CREATE TABLE` par un `DROP TABLE IF EXISTS ... CASCADE;`. **Perdra 110 users, 259 artworks, 96 sessions**.
   - Option B — **Conservatrice** : adapter les 40+ routes restantes à la vraie DB. J'estime 2-3 jours de travail. Plus sûr.
2. **Lancer le déploiement Vercel** après push :
   ```bash
   cd art-core && npx vercel --prod
   cd ../pass-core && npx vercel --prod
   ```
   (**CLAUDE.md interdit le git push → deploy auto**, je ne l'ai donc pas déclenché. Le push est juste du versionning.)
3. **Tester signup depuis Xiaomi** :
   ```bash
   curl -X POST https://art-core.app/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@demo.com","password":"password123","name":"Test","username":"test_user","role":"artist"}'
   ```

## Fichiers non committés (volontairement)

- `.env.vercel.production` (supprimé — contenait le password DB en clair)
- `_apply_patched.sh`, `lib-db-postgres.ts`, `patched-routes/` : artefacts de migration, peuvent être supprimés ou gardés en référence.
- `APPLY-MIGRATION.bat` / `.sh`, `MIGRATION-SUPABASE.md`, `Rapport_Session_13_avril_2026.docx`, `supabase-schema.sql` : laissés en place selon ton choix entre A et B ci-dessus.

## Commandes exactes passées

1. `npm install postgres` (art-core + pass-core)
2. `cp lib-db-postgres.ts art-core/lib/db.ts` + `pass-core/lib/db.ts`
3. `bash _apply_patched.sh` (34 + 9 routes copiées)
4. 4 routes pass-core + 5 server components convertis à la main
5. `git add art-core pass-core && git commit -m "feat: migrate DB to Supabase Postgres"`
6. `git pull --rebase origin main` (conflit fingerprint.ts, `git checkout --theirs`, `--continue`)
7. `git push` → `a7304c2`
8. Probes REST Supabase → mismatch détecté
9. Adaptation auth ciblée (lib/db.ts, signup, login, me)
10. **À faire** : commit du hotfix + `npx vercel --prod` + curl test signup.
