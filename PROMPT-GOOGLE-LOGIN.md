# Prompt — Implémenter le login Google sur ART-CORE et PASS-CORE

## Contexte

Monorepo à la racine `~/Desktop/Projets/art-core/` contenant :
- `art-core/` — app sur https://art-core.app — auth actuelle : magic-link email à `/auth/login`, signup avec nom/email/pseudo/téléphone à `/auth/signup`.
- `pass-core/` — app sur https://pass-core.app — auth actuelle : email + mot de passe à `/auth/login`, avec 3 boutons de comptes démo (artist@demo.com, initie@demo.com, client@demo.com).
- `prime-core/` — autre app de l'écosystème (à priori non concernée par cette tâche, à confirmer).
- `core-db/` — code partagé base de données / auth ?
- `cahier-police`, `photo-module-v2` — modules métier.

Stack présumée (à confirmer en début de tâche) : Next.js App Router, Supabase pour l'auth, React + TypeScript + Tailwind, PWA. Le `CLAUDE.md` à la racine et le `RAPPORT-CLAUDE-CODE.md` contiennent probablement plus de contexte — **commence par les lire**.

## Objectif

Ajouter "Continuer avec Google" (OAuth) sur **art-core** ET **pass-core**, avec le même composant partagé. À la fin l'utilisateur clique le bouton, est redirigé vers Google, revient authentifié, session persistée.

## Étapes

### 1. Reconnaissance — ne rien modifier avant

- Lis `CLAUDE.md` et `RAPPORT-CLAUDE-CODE.md` à la racine.
- Identifie le provider d'auth réel dans les `package.json` de `art-core/` et `pass-core/` : `@supabase/ssr`, `@supabase/auth-helpers-nextjs`, `next-auth`, etc. **Ne suppose pas Supabase, confirme.**
- Liste les fichiers d'auth existants : `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`, `app/auth/callback/route.ts`, `lib/supabase/*`, `middleware.ts`.
- Vérifie s'il y a un package partagé (`core-db/`, `packages/auth/`, etc.) — si oui, c'est là que doit aller le composant `<GoogleSignInButton />`.
- Lis les `.env.example` des deux apps pour le naming des variables.

**Résume-moi en 5–10 lignes ce que tu as trouvé et ta stratégie avant de coder.**

### 2. Configuration provider (étapes humaines)

Donne-moi la liste exacte des étapes à faire à la main :

**Google Cloud Console** :
- Créer/utiliser un projet OAuth.
- Configurer l'écran de consentement.
- Créer un Client ID OAuth 2.0 type "Application Web".
- Redirect URIs à inscrire :
  - `https://art-core.app/auth/callback`
  - `https://pass-core.app/auth/callback`
  - `http://localhost:3000/auth/callback` (et autres ports si besoin pour les deux apps en dev)
  - Si Supabase : aussi `https://<project-ref>.supabase.co/auth/v1/callback`
- Récupérer Client ID et Client Secret.

**Supabase (ou autre provider)** :
- Activer le provider Google.
- Coller Client ID + Secret.
- Vérifier les URL de redirection autorisées dans Authentication → URL Configuration.

### 3. UI — composant partagé

Crée `<GoogleSignInButton />` (dans le package partagé si monorepo le permet, sinon duplique) :
- Au-dessus du formulaire email existant sur `/auth/login` ET `/auth/signup` des deux apps (4 emplacements).
- Divider "ou" stylé entre le bouton Google et le formulaire email.
- Logo Google officiel en SVG inline.
- Style Tailwind cohérent : sombre + accent doré `#D4AF37` sur art-core, sombre + bleu nuit sur pass-core.
- Largeur 100% du conteneur form.
- État loading / disabled pendant la redirection OAuth.
- Texte FR : "Continuer avec Google", "ou", "Connexion en cours…".

### 4. Flow OAuth

- Handler `signInWithGoogle()` côté client (ex. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`).
- Route `/auth/callback` (App Router : `app/auth/callback/route.ts`) qui échange le code contre une session et redirige vers `/` (ou `?next=...` si présent).

**Deux questions à me poser avant de coder, j'ai besoin de trancher :**

(A) **PASS-CORE** — un user existe avec email + password. Si quelqu'un se connecte via Google avec le même email, je veux :
- (a) Fusion auto des comptes (Google devient une méthode supplémentaire pour ce user)
- (b) Refus avec message clair : "Ce compte existe avec un mot de passe — connecte-toi par mot de passe puis lie Google depuis tes paramètres"
Je préfère probablement (a) si Supabase le permet proprement. Recommande-moi.

(B) **ART-CORE** — le signup demande nom + pseudo + téléphone que Google ne fournit pas. Je veux :
- (a) Page `/auth/complete-profile` après le callback, qui collecte les champs manquants si user nouvellement créé
- (b) Profil partiel accepté, complétion plus tard
Je penche pour (a). Recommande-moi.

### 5. Variables d'env

Ajoute aux `.env.example` (jamais aux `.env.local` réels) ce qui est nécessaire selon le provider. Pour Supabase typiquement rien à ajouter côté client, le secret Google va dans le dashboard Supabase. Précise-le clairement.

Si quelque chose va dans `.env`, donne-moi le bloc à ajouter dans Vercel (prod + preview).

### 6. Tests

- Test E2E (Playwright si présent — sinon propose-le) qui vérifie la présence du bouton sur les 4 pages et que le clic déclenche bien une redirection vers `accounts.google.com`.
- Test unitaire du composant `<GoogleSignInButton />` (rendu, click handler, état loading).

### 7. Checklist finale

Donne-moi à la fin une checklist en 6 points :
1. Étapes Google Cloud Console (humain).
2. Étapes Supabase / autre provider (humain).
3. Variables d'env à set en prod (Vercel).
4. Liste des fichiers modifiés / créés.
5. Comment tester en local (commande exacte + URL).
6. Tes choix techniques (en particulier merge-account et profile-completion) à valider avec moi.

## Contraintes

- **Ne touche pas** au flow magic-link existant d'art-core.
- **Ne touche pas** aux comptes démo de pass-core.
- Préserve le style visuel existant.
- Tout en français côté UI.
- TypeScript strict, pas de `any`.
- Pas de breaking change sur les sessions existantes.
- **prime-core n'est pas concerné par cette tâche** — sauf si tu trouves qu'il partage le même code d'auth, auquel cas demande-moi.

## Avant de coder

Pose-moi tes questions ambiguës. Commence par l'étape 1 (reconnaissance) et résume avant de continuer.
