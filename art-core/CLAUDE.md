# ART-CORE — Contexte Claude Code

> ⚠️ LIS CE FICHIER EN ENTIER avant de modifier quoi que ce soit.

## État du projet — Mis à jour le 20 mai 2026

- **Build** : ✅ 0 erreur TypeScript, 60+ routes
- **Supabase** : kmmlwuwsahtzgzztcdaj.supabase.co (57 tables, 160 users, 346 artworks — schéma en place)
- **Vercel** : art-core-brown.vercel.app
- **Production** : redéploiement à valider après la dernière vague de fixes

## Avancement par module

- Art-Core (marketplace) : 95%
- Pass-Core (certification) : 95%
- Prime-Core (paris/wallet) : 90%
- Auth (login/register/onboarding) : 98%
- Admin (KPIs/users/transactions) : 85%
- Hub (navigation 3 apps) : 100%

## Pages (22 écrans)

- Hub : page d'accueil, sélection du rôle
- Art-Core : Dashboard, Boutique, Boutique-Promotion, Certifier, Déposer, FAQ, Favoris, Initié, Messages, Notifications, Nova-Bank, Orders, Profile, Search, Wallet, About
- Pass-Core : Certifier
- Prime-Core : Dashboard
- Auth : Login, Signup

## Ce qui reste à faire (PRIORITÉ)

1. **CRITIQUE** : Déconnecter Git de Vercel (cause des pannes à répétition)
2. **CRITIQUE** : Redéployer via CLI (`npx vercel --prod`)
3. Compléter les placeholders dans .env.local :
   - `STRIPE_WEBHOOK_SECRET=whsec_REMPLACE` → créer dans dashboard Stripe
   - `STRIPE_PLATFORM_ACCOUNT_ID=acct_REMPLACE` → ID du compte Stripe Connect
   - `RESEND_API_KEY=re_REMPLACE` → créer sur resend.com
4. Ajouter les variables d'env sur Vercel : `npx vercel env add [NOM] production`
5. **Dette sécu Supabase** (voir `get_advisors` MCP) :
   - 16 tables avec RLS activé mais sans policies → tout bloqué côté `anon`
   - 5 fonctions `SECURITY DEFINER` exposées en `/rpc/` au rôle `anon`
     (`handle_new_user`, `increment_artwork_views`, `increment_oeuvres_count`,
     `send_message_admin_notification`) — décider intentionnel ou à révoquer
   - 5 fonctions sans `search_path` figé (linter `function_search_path_mutable`)
   - Extension `pg_trgm` dans le schéma `public` → à déplacer
   - `auth_leaked_password_protection` désactivé (HaveIBeenPwned)

## Commandes

```bash
npm run dev        # Dev sur http://localhost:3000
npm run build      # Build production
npm run typecheck  # Vérification TypeScript seule
npx vercel --prod  # Déployer (CLI uniquement, JAMAIS via Git push)
```

## Déploiement

- **3 projets Vercel séparés** (un par app, vu qu'il n'y a pas de routing par host) :
  - `art-core-final`   → Root Directory `art-core`   → domaine `art-core.app`
  - `pass-core-final`  → Root Directory `pass-core`  → domaine `pass-core.app`
  - `prime-core-final` → Root Directory `prime-core` → domaine `prime-core.app`
- Tous sur l'équipe Vercel `captainpglg-hues-projects`, repo `captainpglg-hue/art-core`, branche `main`.

### Historique — Sprint « kill switch qualité photo » (avril 2026)

Pendant ce sprint terminé, `git push origin main` était autorisé comme exception
temporaire pour itérer vite. **Règle actuelle restaurée** : déployer
uniquement via `npx vercel --prod`. La déconnexion Git → Vercel reste à
faire (voir Ce qui reste à faire, point 1).

## Organisation des fichiers

- **SOURCE DE VÉRITÉ** = ce dossier (`art-core/` dans le monorepo `art-core`)
- Travail directement dans le repo Git ; pas de dossier "final" parallèle
- Ne jamais créer de nouveau dossier "copie" ou "test"

## Philosophie du projet
- Esthétique : Christie's (dark luxury, or #D4AF37, navy #0A1128)
- Fonctionnel : aussi simple que Vinted (3 clics max)
- Zéro jargon blockchain visible par l'utilisateur
- "Certifié ✅" pas "SHA-256 verified"

## Modèle économique
- Artiste : GRATUIT à vie
- Commission vente : 25%
- Consultation Pass-Core : 0,50€ (0,10€ → propriétaire)
- Pass-Core propriétaire : 49€ + 5€/mois
- Pass Magnat Initié : 9,90€/mois
- Parrainage bancaire : 70€ net + 15€ flexible
- Lancement : 21 juin 2026 — Fête de la Musique

## Stack technique
Next.js 14 + TypeScript + Supabase + Stripe Connect
+ Cloudinary + Tailwind + shadcn/ui + Recharts

## Entité légale
ART-CORE GROUP LTD — Companies House UK
art-core.app — contact@art-core.app
