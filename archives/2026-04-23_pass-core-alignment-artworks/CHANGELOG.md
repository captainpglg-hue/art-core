# 2026-04-23 — Alignement pass-core sur le fix art-core (certify + cache)

## Contexte

Pass-core partage le même module `lib/db.ts` qu'art-core (par copy-paste historique) et la même table `artworks`. Les corrections appliquées à art-core le même jour ont révélé 2 points à répliquer côté pass-core :

## 1. `pass-core/lib/db.ts` — `cache: "no-store"` dans `restFetch()`

Même bug que dans art-core : Next.js server components cachent les réponses `fetch()` à l'infini par défaut. Les nouvelles certifications n'apparaîtraient jamais dans les pages server-side sans redeploy.

Fix : ajout de `cache: "no-store"` dans `restFetch()` (ligne 54).

## 2. `pass-core/app/api/certify/route.ts` — INSERT enrichi

Avant, l'INSERT artwork depuis `/api/certify` ne peuplait pas :
- `is_for_sale` (par défaut `false` → invisible sur filtres marketplace)
- `image_url` (nouvelle colonne, la card ne peut pas afficher de thumbnail)
- `additional_images` (nouvelle colonne, les photos secondaires ne sont pas liées)

Après, on peuple :
- `image_url = photos[0]`
- `additional_images = photos.slice(1)` (typé TEXT[])
- `is_for_sale = true`

Colonne legacy `photos` (TEXT JSON) conservée pour compatibilité.

## Diff complet

Voir `patch.diff` dans ce dossier.

## Risque

Aucun : les 3 ajouts sont purement additifs (on ne retire ni ne modifie aucun champ existant). Les œuvres certifiées par pass-core depuis le 14 avril n'avaient donc pas `image_url` peuplé — elles apparaissent via thumbnail placeholder sur la marketplace. Un script de backfill peut être lancé plus tard si besoin (non prioritaire).

## Patch secondaire 2026-04-24 : certification_photos reçoit array, pas JSON string

Bug latent découvert en lançant un test bout-en-bout `POST /api/certify` :

```
DB insert artwork failed: malformed array literal (code=22P02)
```

Cause : la colonne `certification_photos` est de type `TEXT[]` avec default `'{}'::text[]`. Le code passait `${photosJson}` (une chaîne JSON) à cette position, alors qu'il faut passer un array JavaScript natif (postgres-js le convertit en TEXT[] automatiquement).

Fix : remplacer `${photosJson}` par `${photosArr}` dans le slot `certification_photos` de l'INSERT (l'array typé `string[]` existe déjà dans la portée locale).

Ce bug existait dès l'ajout de la certification le 13 avril — il ne faisait tomber que les certifications passant par cette route. La table `pass_core_certifications` (26 rows) a probablement été peuplée par un autre chemin (seed, ou quand `certification_photos` valait encore TEXT).

Fichier archivé : `certify-route.ts.2026-04-24-fix-certification-photos`.

## Rappel déploiement

Git push ≠ deploy. Commandes :

```powershell
cd "C:\Users\Gigon Le Grain\Desktop\art-core"
npx vercel --prod --yes
```
