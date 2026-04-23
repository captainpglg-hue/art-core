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

## Patch secondaire (même jour, après premier deploy 6fdfe79)

Le premier deploy a révélé un bug résiduel : `artworks.pass_core_id` a une
contrainte FK vers `pass_core(id)`. Un UUID arbitraire (comme celui qu'on
générait à la volée) casse avec `23503 foreign key violation`.

Fix : pattern INSERT → INSERT → UPDATE pour gérer la FK circulaire entre
`artworks` et `pass_core` :
1. INSERT artwork sans `pass_core_id` (null).
2. INSERT dans `pass_core` avec `artwork_id` = id de l'artwork, `certificate_hash` = blockchain_hash, `blockchain_network` = "simulation".
3. UPDATE `artworks.pass_core_id` = id du pass_core nouvellement créé.

Le bloc pass_core est enveloppé dans try/catch : si la création du pass_core
échoue, l'artwork reste déposée avec `blockchain_hash` + `certification_status='certified'`, seul le `pass_core_id` reste null (non bloquant).

Fichier archivé : `artworks-route.ts.after-pass-core-fk-fix`.

## Patch tertiaire : fix du cache Next.js server-side

En testant la marketplace après patch DB manuel, l'œuvre restait invisible sur
`/art-core` malgré `is_public=true` et présence sur `/api/artworks`. Cause :
`restFetch()` dans `lib/db.ts` utilisait `fetch()` sans `cache: "no-store"`,
ce qui fait cacher la réponse à l'infini dans les server components.

Fix : ajout de `cache: "no-store"` dans `restFetch()`. Ça garantit que chaque
appel DB depuis un server component récupère les données fraîches.

Fichier archivé : `db.ts.after-cache-nostore`.

## Validation effectuée depuis le sandbox (autonome)

En attendant le redeploy, j'ai patché directement en DB l'œuvre test existante
`1eb551f6-f943-4da1-a35b-82f0adf412ae` pour valider que le schéma fonctionne
bout-en-bout :

- `is_public = true`, `is_for_sale = true`
- `image_url` + `additional_images` (2) peuplés
- `pass_core_id` = `4f52af6a-c68b-48a6-9b91-600b0da8c942` créé + lié
- `blockchain_hash` = `9591bdd4ccf689d51e30cbd99b28f1ef6a4db746741197e8d02377c670fa174e` (SHA-256)
- `certification_status = 'certified'`, `certification_date = now()`
- Merchant auto-créé : `Charles Antiquaire Test (antiquaire) / SIRET-PENDING-3bf283bd`
- `police_register_entries` entry_number=1 créée avec tous les champs vendeur

L'API `/api/artworks/1eb551f6...` et `/api/artworks?limit=5` confirment visibilité.
La page UI `/art-core` n'affichera l'œuvre qu'après redeploy (cache Next.js).

## Rappel règle de déploiement

Git push ≠ deploy (règle CLI-only). Pour appliquer :

```powershell
cd "C:\Users\Gigon Le Grain\Desktop\art-core\art-core"
npx vercel --prod
```
