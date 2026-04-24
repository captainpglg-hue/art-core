# CHANGELOG — PASS-CORE

> Journal des évolutions de l'app **pass-core** (certification blockchain des œuvres).
> Format : date (AAAA-MM-JJ) → [commit] → résumé.
> Reconstruit à partir de l'historique Git le 2026-04-23.

---

## [Non publié]

- Tests bout-en-bout du flow certification depuis mobile.

## 2026-04-24 — Fix bug latent certification_photos (22P02)

- `app/api/certify/route.ts` : `certification_photos` recevait `photosJson` (string JSON) au lieu d'un array JS. PostgreSQL rejetait avec `malformed array literal (22P02)` dès que le code path était réellement exécuté. Remplacé par `photosArr` (array natif). Bug dormant depuis le 13 avril.
- Archive : `archives/2026-04-23_pass-core-alignment-artworks/certify-route.ts.2026-04-24-fix-certification-photos`.

## 2026-04-23 — Alignement sur le fix art-core

- `lib/db.ts` : `cache: "no-store"` ajouté dans `restFetch()` (même fix que art-core — évite le cache infini des server components).
- `app/api/certify/route.ts` : INSERT artwork enrichi avec `image_url`, `additional_images` (nouveau schéma) et `is_for_sale = true`. Les œuvres certifiées apparaîtront désormais correctement sur la marketplace.
- Archive : `archives/2026-04-23_pass-core-alignment-artworks/` (CHANGELOG + diff).

---

## 2026-04-22

- `d67e358` chore : normalisation globale des fins de ligne.

## 2026-04-21 — Flow seamless complet

- `d9b5d54` Update `route.ts`.
- `4a90ee0` fix(photos) : helper unifié `resolvePhotoUrl` (partagé avec art-core).
- `4a3ca92` fix(images) : whitelist `placehold.co` + `picsum.photos`.
- `a455a1f` **feat(pass-core)** : flow seamless photos → identification → auto-signup + auto-merchant + fiche-police.
- `a08af0c` feat(pass-core/certify) : miroir du hook fiche-police d'art-core pour les pros qui certifient via pass-core.

## 2026-04-20 — Nettoyage schéma DB

- `09d71dc` fix : `users.name` → `users.full_name` sur toutes les pages.
- `b280d66` fix : parsing sécurisé des photos (TEXT[] vs JSON legacy).
- `c82aaba` fix(pass-core/mailer) : gestion du filesystem read-only sur Vercel.
- `ac6add0` fix(certify) : passage direct du tableau photos à postgres-js (fix 22P02 malformed array literal).

## 2026-04-19 — Auth pass-core + certifier mobile

- `3914fa8` fix(pass-core) : ajout `react-hook-form` + `@hookform/resolvers` (fix build login page).
- `472d42d` **feat(pass-core)** : endpoints auth + page login + signup cross-domain.
- `4450ca1` fix(certifier) : compression client-side des photos avant submit (fix 413).
- `f0ca978` fix(certifier) : jauge visible en haut + bas, certify accepte tous les rôles.
- `03472ee` feat(certifier) : jauge temps réel sur les 3 photos macro.
- `2141913` fix(pass-core) : UUID pour `artworks.id` + `owner_id`, restore du flow 4-photos.

## 2026-04-18

- `5597939` restore : photo-module-v2 (jauges + pHash + fix 413 compression).
- `390d120` fix(db) : `u.name` → `u.full_name AS name` (schema desync fix).
- `54e9572` feat(db) : REST fallback complet.

## 2026-04-17 — Hardening

- `3df94f1` feat(db) : fallback Supabase REST dans `pingDb`.
- `da9a1b6` fix(pass-core) : restore route handler `admin/request-code` tronqué.
- `42e31bd` fix(core) : restore `lib/db.ts` tronqué dans les deux projets.
- `a9050db` fix(pass-core) : ajout de la dépendance `postgres` manquante dans `package.json`.
- `07c5141` fix(core) : sync schéma DB, SQL hardening, sécurité admin + `/api/health`.

## 2026-04-14 — Migration SQLite → Supabase Postgres

- `a7304c2` feat : migration DB vers Supabase Postgres (34 + 9 routes patchées, 4 routes pass-core à la main).
- `f275dfb` fix(auth) : adapt signup/login au schéma Supabase live (full_name, UUID, boolean).

## 2026-04-13 — Jauges qualité + certification email

- `182f381` fix : résilience des libs de services externes face aux env vars manquantes.
- `fee8222` fix : error handling robuste pour le flow certification (prevent `unexpected token R`).
- `a2d504f` feat : jauge qualité instantanée — visible dès la prise de la macro.
- `cabbe51` feat : inclure les 3 photos macro dans l'email de certification.
- `8aef960` feat : validation jauge qualité sur les 3 photos macro.
- `2424e50` feat : restore des 3 photos macro dans le flow certification.
- `498ec0b` fix : colonnes et tables manquantes dans le schéma DB pass-core.
- `7fc6c09` feat : alignement du seed pass-core sur art-core — 34 users, 30 œuvres (10+10+10).
- `4f01fde` fix : images d'œuvres (Unsplash) + placeholder fallback.

## 2026-04-12

- `b31cf17` fix : mode beta OTP — retourne le code dans la réponse API si SMTP non configuré.
- `ed36b87` feat : système admin OTP complet + support Vercel.

## 2026-04-11

- `81d538d` fix : réparation mojibake + classe Tailwind + schéma fingerprint compare.
- `6ae6eeb` fix : réparation des fichiers pass-core corrompus + landing page + env vars.
- `929d71a` fix : ignorer les erreurs TS/ESLint pendant les builds Vercel.

## 2026-04-10

- `662e1c5` fix : corrections accents page certifier (œuvre, certifiées, etc.).
- `7aff6f5` fix : corrections accents FR, nouveaux rôles vendeurs, liens env vars.

## 2026-04-08

- `b176ca3` fix(pass-core) : erreurs TS sur la route fingerprint compare.
- `e7e31ad` reorganize : unification de toutes les apps depuis les sources `*-final`.

## 2026-04-04

- `1b0b5fe` fix(photos + email + micro) : domaine Supabase dans `next.config remotePatterns`, Resend SMTP, dictée vocale.
- `9b38690` fix(mailer + micro) : Resend SMTP + dictée vocale description.

## 2026-04-03

- `b231f72` fix : photos dans email certificate + API fingerprint compare + UX verifier.
- `cab8e60` fix : migration du stockage photos vers Supabase Storage + photos dans l'email.

## 2026-03-22

- `694c976` full backup — art-core, pass-core, prime-core, core-db.
