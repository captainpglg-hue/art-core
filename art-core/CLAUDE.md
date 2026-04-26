# ART-CORE — Contexte Claude Code

> ⚠️ LIS CE FICHIER EN ENTIER avant de modifier quoi que ce soit.

## État du projet — Mis à jour le 8 avril 2026

- **Build** : ✅ 0 erreur TypeScript, 60+ routes
- **Production** : ❌ DOWN (Vercel cassé — voir Déploiement)
- **Supabase** : kmmlwuwsahtzgzztcdaj.supabase.co
- **Vercel** : art-core-brown.vercel.app

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
3. **CRITIQUE** : Exécuter les migrations SQL (supabase/migrations/001_initial_schema.sql — 21 tables)
4. Compléter les placeholders dans .env.local :
   - `STRIPE_WEBHOOK_SECRET=whsec_REMPLACE` → créer dans dashboard Stripe
   - `STRIPE_PLATFORM_ACCOUNT_ID=acct_REMPLACE` → ID du compte Stripe Connect
   - `RESEND_API_KEY=re_REMPLACE` → créer sur resend.com
5. Ajouter les variables d'env sur Vercel : `npx vercel env add [NOM] production`

## Commandes

```bash
npm run dev        # Dev sur http://localhost:3000
npm run build      # Build production
npm run typecheck  # Vérification TypeScript seule
npx vercel --prod  # Déployer (CLI uniquement, JAMAIS via Git push)
```

## Déploiement

- **Projet Vercel** : `prj_XK8uVcpwz84z0STo03QZZ85XXPUy`
- **Domaines** : art-core.app, pass-core.app, prime-core.app
- **⚠️ INTERDIT** : ne jamais créer de nouveau projet Vercel

### Sprint « kill switch qualité photo » (avril 2026) — exception temporaire

Auto-deploy Vercel via `git push origin main` est **explicitement autorisé**
le temps de ce sprint pour itérer rapidement sur le parcours de dépôt
(transformation des validations qualité photo en warnings non bloquants,
test terrain Xiaomi). À la fin du sprint, restaurer la règle "deploy CLI
uniquement" et déconnecter Git de Vercel.

## Organisation des fichiers

- **SOURCE DE VÉRITÉ** = ce dossier (`art-core-final/`)
- Le repo Git (`core-ecosystem-git/`) est synchronisé MANUELLEMENT
- Ne jamais créer de nouveau dossier "copie" ou "test" dans Dev/

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
