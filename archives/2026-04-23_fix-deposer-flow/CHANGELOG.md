# 2026-04-23 — Fix complet du flow dépôt d'œuvre

## Contexte

Test utilisateur bout-en-bout (compte antiquaire, dépôt d'une œuvre avec photos,
certification, fiche de police, marketplace) a révélé 5 bugs bloquants. Ce patch
corrige les 5 en une passe, dans l'ordre demandé par Philippe.

## Bugs identifiés (tests du 23 avril)

1. **Fiche de police KO** — code pointe vers `cahier_police` (table absente).
2. **Œuvre invisible sur marketplace** — `is_public: false` par défaut, non écrasé au dépôt.
3. **Erreur SQL brute exposée** sur `/art-core/cahier-police`.
4. **Aucune certification Pass-Core** après dépôt (`pass_core_id: null`).
5. **Mismatch schéma photos** — stockées dans `photos` (legacy TEXT JSON) mais jamais dans `image_url` + `additional_images` (nouveau schéma).

## Ce qui a été fait

### 1. `app/api/cahier-police/route.ts` — Rewire vers `police_register_entries`

La table `cahier_police` n'a jamais été créée en prod. En revanche,
`police_register_entries` existe, a 13 rows, et est déjà utilisée par le hook
fiche-police de `/api/artworks`. On fait donc pointer la route cahier-police
sur cette table, avec un mapping UI ↔ DB documenté en tête du fichier.

### 2. `app/api/artworks/route.ts` — INSERT enrichi + certification auto

- `is_public = true`, `is_for_sale = true` à l'INSERT.
- `image_url` = `photos[0]`, `additional_images` = `photos.slice(1)` (nouveau schéma).
- Colonne legacy `photos` conservée en parallèle (JSON stringify) pour ne rien casser.
- Génération d'un `pass_core_id` (UUID) et d'un `blockchain_hash` (SHA-256 du JSON {artwork_id, title, artist_id, photos, certified_at}) à la création.
- `certification_status = 'certified'`, `certification_date = NOW()`.
- Auto-provisioning d'un profil merchant par défaut pour les pros qui n'en ont pas → évite la sortie "missing_merchant_profile" au premier dépôt. L'utilisateur devra compléter SIRET/ROM ensuite via `/pro/inscription` (le SIRET placeholder est `SIRET-PENDING-<8 premiers chars du user id>` pour être clairement identifiable).

### 3. `app/(art-core)/art-core/cahier-police/page.tsx` — UI erreur propre

Plus d'erreur SQL JSON exposée. Messages utilisateur selon le code HTTP :
- 401 → invitation à se reconnecter
- 403 → explication du rôle requis
- Autres → message générique avec contact support

Le détail technique reste en console.warn pour le debug.

## Fichiers modifiés

- `art-core/app/api/artworks/route.ts`
- `art-core/app/api/cahier-police/route.ts`
- `art-core/app/(art-core)/art-core/cahier-police/page.tsx`

## Fichiers archivés ici (versions "avant")

- `artworks-route.ts.before`
- `cahier-police-api-route.ts.before`
- `cahier-police-page.tsx.before`

## Tests à refaire après deploy

1. Dépôt d'une œuvre depuis un compte antiquaire → vérifier :
   - `pass_core_id` non null + `blockchain_hash` en 64 hex
   - `is_public = true`, `is_for_sale = true`
   - `image_url` non null, `additional_images` peuplé si plusieurs photos
   - Œuvre visible sur `/art-core` (marketplace principale)
2. Aller sur `/art-core/cahier-police` → voir la liste (pas d'erreur SQL)
3. Si un merchant a été auto-provisionné, le compléter via `/pro/inscription`.

## Rappel règle de déploiement

Git push ≠ deploy (règle CLI-only). Pour appliquer :

```powershell
cd "C:\Users\Gigon Le Grain\Desktop\art-core\art-core"
npx vercel --prod
```
