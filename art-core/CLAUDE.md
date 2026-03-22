# ART-CORE — Contexte Claude Code

## État du projet
- Build : 60 routes · 0 erreurs · 0 warnings
- Déployé sur Vercel : https://art-core-brown.vercel.app
- Supabase : kmmlwuwsahtzgzztcdaj.supabase.co

## Ce qui est fait
- Pass-Core : 95% (certification SHA-256 + pHash, caméra guidée, partage, messagerie anonyme)
- Art-Core : 95% (marketplace, fiche œuvre, checkout Stripe, favoris, notifications)
- Prime-Core : 90% (wallet, leaderboard anonyme, liens affiliation, Pass Magnat)
- Auth : 98% (login, register, forgot-password, reset-password, onboarding 5 rôles)
- Admin : 85% (KPIs, users, transactions, export PDF, paramètres)
- Hub : 100% (navigation 3 apps, compteur live)

## Ce qui reste à faire DEMAIN
1. CRITIQUE — Créer comptes et remplir .env.local :
   - Stripe : dashboard.stripe.com → API Keys
     → STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY
   - Cloudinary : cloudinary.com → Settings → API Keys
     → CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET
   - Supabase DB password → DATABASE_URL complet
   - Supabase JWT Secret

2. Ajouter ces variables sur Vercel :
   npx vercel env add [NOM] production

3. Exécuter migrations SQL dans Supabase :
   Supabase Dashboard → SQL Editor →
   coller supabase/migrations/001_initial_schema.sql
   → Run (21 tables à créer)

4. Relancer : npx vercel --prod --yes

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
