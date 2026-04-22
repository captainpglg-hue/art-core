# PRIME-CORE — Contexte Claude Code

> ⚠️ LIS CE FICHIER EN ENTIER avant de modifier quoi que ce soit.

## État du projet — Mis à jour le 8 avril 2026

- **Build** : à vérifier (`npx tsc --noEmit`)
- **Avancement** : 90%
- **Production** : prime-core.app (état à vérifier)

## Ce que fait Prime-Core

Prime-Core est la plateforme de paris/investissement de l'écosystème Art-Core :
- Wallet utilisateur
- Leaderboard anonyme
- Liens d'affiliation
- Pass Magnat (abonnement premium 9,90€/mois)

## Commandes

```bash
npm run dev        # Dev sur http://localhost:3002 (port 3002 !)
npm run build      # Build production
npm run typecheck  # Vérification TypeScript
npx vercel --prod  # Déployer (CLI uniquement)
```

## Stack

- Next.js 14.2.5 + TypeScript + Supabase + Stripe + Tailwind + shadcn/ui

## Design

- Dark navy #0A1128 + Or #D4AF37 (identique art-core et pass-core)

## Déploiement

- Même projet Vercel que art-core et pass-core
- Domaine : prime-core.app
- CLI uniquement, PAS de Git deploy

## Relation avec les autres apps

- Partage la même base Supabase, mêmes clés Stripe/Cloudinary
- art-core-final = app principale (port 3000)
- pass-core-final = certification (port 3001)
