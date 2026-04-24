# CHANGELOG — ART-CORE

> Journal des évolutions de l'app **art-core** (marketplace).
> Format : date (AAAA-MM-JJ) → [commit] → résumé.
> Reconstruit à partir de l'historique Git le 2026-04-23.

---

## [Non publié]

Travaux en cours non encore livrés en prod :
- Onboarding Stripe Connect pour les artistes (actuellement paiement → plateforme uniquement, redistribution manuelle).
- Tests bout-en-bout à refaire après redeploy.

## 2026-04-24 — Paiement Stripe câblé (PaymentIntent + webhook + Elements)

- **Nouveau** `POST /api/purchase` : crée un Stripe PaymentIntent pour l'achat d'une œuvre, retourne `client_secret`. Gère auth, doublons, auto-achat.
- **Nouveau** `POST /api/webhooks/stripe` : vérifie signature, sur `payment_intent.succeeded` marque l'œuvre `sold` + crée `ownership_transfers` + notifications. Idempotent.
- **Nouveau** `checkout/checkout-client.tsx` : composant client Stripe Elements avec `<PaymentElement />`, gestion du redirect de confirmation, écran succès.
- **Modifié** `checkout/page.tsx` : intègre `CheckoutClient` si Stripe est configuré ; sinon fallback "contacter l'artiste".
- Archive : `archives/2026-04-24_stripe-cabling/` (CHANGELOG + 4 fichiers).
- **Action manuelle requise** : enregistrer le webhook `https://art-core.app/api/webhooks/stripe` dans le dashboard Stripe (events `payment_intent.succeeded` + `payment_intent.payment_failed`), copier le signing secret dans `STRIPE_WEBHOOK_SECRET` sur Vercel.

## 2026-04-24 — Bouton Acheter + page checkout enrichie

- `app/(art-core)/art-core/oeuvre/[id]/page.tsx` : ajout d'un bouton **Acheter** (couleur or) à côté du bouton Contacter. Les 2 CTAs sont maintenant en grille 2 colonnes.
- `app/(art-core)/art-core/checkout/page.tsx` : réécriture pour afficher récap œuvre + détail splits 90/10 + bouton Stripe désactivé (prêt pour câblage). Redirige vers login si non connecté, renvoie vers messages si l'utilisateur tente d'acheter sa propre œuvre.
- Archive : `archives/2026-04-24_bouton-acheter/` (CHANGELOG + 2 fichiers).

## 2026-04-23 — Fix complet du flow dépôt d'œuvre (5 bugs)

Suite au test utilisateur bout-en-bout (compte antiquaire, dépôt avec photos, certification, fiche de police, marketplace), 5 bugs bloquants identifiés et corrigés en une passe :

- `app/api/cahier-police/route.ts` : rewire de la route sur la table réelle `police_register_entries` (la table `cahier_police` référencée n'existait pas).
- `app/api/artworks/route.ts` : INSERT enrichi — `is_public=true`, `is_for_sale=true`, `image_url` + `additional_images` (nouveau schéma), `pass_core_id` + `blockchain_hash` SHA-256 générés automatiquement, auto-provisioning d'un merchant par défaut pour les pros sans profil.
- `app/(art-core)/art-core/cahier-police/page.tsx` : UI d'erreur propre, plus d'exposition d'erreur SQL brute.

Archive complète : `archives/2026-04-23_fix-deposer-flow/` (versions avant + CHANGELOG détaillé).

---

## 2026-04-22 — Search & encodage

- `d67e358` chore : normalisation globale des fins de ligne (application rétroactive de `.gitattributes`).
- `256b3b4` docs(search) : docstring alignée avec les params réellement implémentés.
- `2ca0656` fix(search) : suppression des références aux colonnes inexistantes (`artworks.style`, `artworks.pickup_available`).
- `30a7d8b` fix(search) : réécriture via client Supabase direct (corrige les 500 du translator SQL → REST).

## 2026-04-21 — Photos & signup

- `4a90ee0` fix(photos) : helper unifié `resolvePhotoUrl` — gère tous les formats photo historiques.
- `4a3ca92` fix(images) : whitelist `placehold.co` + `picsum.photos`, logs verbeux sur échec d'upload.
- `d9458e9` fix(signup) : username auto-sanitizé (lowercase + strip caractères invalides à la saisie).

## 2026-04-20 — Nettoyage mismatch schéma DB

- `c76ddec` feat(fiche-police) : fallback Storage + page admin pour envoi manuel quand email KO.
- `d534a8e` fix(artworks) : suppression de `users.name` dans `/api/artworks`, clean du cast dans `getArtworkById`.
- `09d71dc` fix : `users.name` → `users.full_name` sur toutes les pages art-core + pass-core.
- `c1dfc72` fix(db) : suppression de la colonne inexistante `users.name` dans `getArtworks` + `getGaugeEntries`.
- `fe9b432` fix(marketplace) : `await` manquant sur `getArtworks()` — corrige 500 sur `/art-core`.
- `b280d66` fix : parsing sécurisé des photos sur art-core + pass-core (TEXT[] vs JSON legacy).

## 2026-04-19 — Fiche de police & cahier

- `6694457` diag(fiche-police) : révèle le prefix + la longueur de la clé Resend quand elle est rejetée.
- `377630a` fix(fiche-police) : diagnostics + API Resend + fallback admin.
- `9a89485` fix : domaine d'envoi Resend + GET artwork via client Supabase.
- `1e52bd0` fix(deposer + db) : audit 4 bugs + alignement du schéma DB.

## 2026-04-18 — Photo-module v2 + signup live

- `5597939` restore : photo-module-v2 (jauges + pHash + fix 413 compression).
- `84e2ee3` fix(signup) : usage de `full_name` + `is_initie` boolean pour matcher le schéma déployé.
- `e4129be` feat(signup) : flag env `ALLOW_SIGNUP_OVERWRITE` pour tests.
- `40d899b` fix(artworks) : réécriture du GET via client Supabase (skip du translator cassé).
- `77b9bfb` feat(art-core) : restore module cahier de police (auto-fiche + PDF + email).
- `390d120` fix(db) : `u.name` → `u.full_name AS name` (schema desync fix).
- `54e9572` feat(db) : REST fallback complet.

## 2026-04-17 — Hardening DB

- `3df94f1` feat(db) : fallback Supabase REST dans `pingDb`.
- `07c5141` fix(core) : sync schéma DB, SQL hardening, sécurité admin + `/api/health`.

## 2026-04-15

- `c388f15` fix : GaugeBar tolérant + Certifier lien vers `pass-core.app`.

## 2026-04-14 — Migration SQLite → Supabase Postgres (gros chantier)

- `a7304c2` feat : migration DB vers Supabase Postgres (remplacement de `better-sqlite3` par `postgres`, 34 routes patchées).
- `f275dfb` fix(auth) : adapt signup/login au schéma Supabase live (full_name, UUID, boolean).

## 2026-04-13

- `ccd42fc` fix : ajout du module `lib/fingerprint.ts` manquant.
- `182f381` fix : résilience des libs de services externes face aux env vars manquantes.
- `0a186f8` Create fingerprint.ts.
- `cfa38cd` fix : ajout des colonnes DB manquantes + implémentation cahier de police.
- `b0821a5` fix : sync certifier pass-core sur le build art-core — jauges qualité instantanées.
- `8e80a54` feat : scénario de test étendu (10 artistes, 10 galeristes, 10 antiquaires, 30 œuvres).
- `4f01fde` fix : images d'œuvres (Unsplash) + placeholder fallback.

## 2026-04-12 — Admin & OTP

- `61c2f2b` fix : suppression d'un paramètre en trop dans INSERT transactions (init DB Vercel).
- `b31cf17` fix : mode beta OTP — retourne le code dans la réponse API si SMTP non configuré.
- `ed36b87` feat : système admin OTP complet + support Vercel.
- `e934aae` fix : réparation des composants navbar tronqués (build failure).
- `f901d96` feat : dashboard admin complet (users + export data).
- `f470fe8` feat : panel admin de gestion des œuvres.

## 2026-04-11 — Mojibake & encoding

- `81d538d` fix : réparation mojibake + classe Tailwind + schéma fingerprint compare.
- `069c9fd` fix : conversion navbar Latin-1 corrompus → UTF-8 valide.
- `6ae6eeb` fix : réparation des fichiers pass-core corrompus + landing page + env vars.
- `929d71a` fix : ignorer les erreurs TS/ESLint pendant les builds Vercel.

## 2026-04-10 — Accents & env vars cross-app

- `7aff6f5` fix : corrections accents FR, nouveaux rôles vendeurs, liens env vars.
- `13cb8dd` fix : utiliser une env var pour le redirect PRIME-CORE.
- `975a7b0` fix : cookie signup auth sécurisé en prod.
- `1207ef8` fix : cookie auth sécurisé en prod.
- `4e8e60f` fix : remplacement des liens localhost par env vars pour la nav cross-app.

## 2026-04-08 — Réorganisation monorepo

- `d3c1691` fix(api) : 3 routes manquantes pour le test Android du certifier.
- `d5d5fc2` feat(certifier) : intégration du formulaire certifier complet dans le monorepo.
- `e7e31ad` reorganize : unification de toutes les apps depuis les sources `*-final`, fix `ArtworkCard use client`.

## 2026-04-04

- `1b0b5fe` fix(photos + email + micro) : ajout du domaine Supabase dans `next.config remotePatterns`, Resend SMTP pour les emails, dictée vocale ajoutée au certifier.

## 2026-04-03

- `cab8e60` fix : migration du stockage photos vers Supabase Storage + photos ajoutées à l'email de certification.

## 2026-03-22

- `694c976` full backup — art-core, pass-core, prime-core, core-db.
