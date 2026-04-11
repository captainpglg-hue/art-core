# PASS-CORE — Contexte Claude Code

> ⚠️ LIS CE FICHIER EN ENTIER avant de modifier quoi que ce soit.

## État du projet — Mis à jour le 8 avril 2026

- **Build** : ✅ 0 erreur TypeScript
- **Pages** : 3 écrans (Certifier, Vérifier, Galerie) + 6 API routes
- **Avancement** : 85%
- **Production** : ❌ DOWN (Vercel cassé — voir section Déploiement)

## Architecture

```
pass-core-final/
├── app/
│   ├── page.tsx                      → Page d'accueil
│   ├── layout.tsx                    → Layout principal
│   ├── pass-core/
│   │   ├── certifier/page.tsx        → Formulaire de certification (675 lignes)
│   │   ├── verifier/page.tsx         → Vérification d'un certificat
│   │   └── gallery/page.tsx          → Galerie des œuvres certifiées
│   └── api/
│       ├── certify/route.ts          → API certification (SHA-256 + pHash + Supabase Storage)
│       ├── verify/route.ts           → API vérification
│       ├── fingerprint/route.ts      → API empreinte digitale
│       ├── ai-describe/route.ts      → Description IA (Anthropic)
│       ├── analyze-photo/route.ts    → Analyse photo IA
│       └── blockchain/status/route.ts → Statut blockchain Polygon
├── components/
│   ├── pass-core/PassNavbar.tsx      → Navigation
│   ├── shared/PWAInstaller.tsx       → Installation PWA
│   └── ui/                           → Composants shadcn/ui
├── lib/
│   ├── blockchain.ts                 → Client blockchain (viem/Polygon)
│   ├── db.ts                         → Client SQLite (better-sqlite3)
│   ├── fingerprint.ts                → Calcul empreinte SHA-256 + pHash
│   ├── mailer.ts                     → Envoi emails (Nodemailer/Resend)
│   ├── supabase-storage.ts           → Upload photos Supabase Storage
│   └── utils.ts                      → Utilitaires
└── public/                           → Assets statiques
```

## Stack technique

- Next.js 14.2.5 + TypeScript
- Supabase (auth + storage + DB)
- Cloudinary (images)
- Anthropic SDK (IA description)
- better-sqlite3 (DB locale fallback)
- viem (blockchain Polygon)
- sharp (traitement images)
- Tailwind CSS + shadcn/ui

## Commandes

```bash
npm run dev        # Dev sur http://localhost:3001 (port 3001 !)
npm run build      # Build production
npm run typecheck  # Vérification TypeScript seule
npx vercel --prod  # Déployer sur Vercel (CLI uniquement, PAS de Git deploy)
```

## Variables d'environnement requises (.env.local)

⚠️ Le .env.local actuel est VIDE (juste un token Vercel expiré). Il faut copier les clés depuis art-core-final/.env.local et adapter les URLs.

Variables nécessaires :
- NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY + STRIPE_SECRET_KEY
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
- ANTHROPIC_API_KEY
- BLOCKCHAIN_* (mode simulation pour l'instant)
- NEXT_PUBLIC_APP_URL=http://localhost:3001

## Déploiement

- **Projet Vercel** : `prj_XK8uVcpwz84z0STo03QZZ85XXPUy` (partagé avec art-core)
- **Domaine** : pass-core.app
- **⚠️ RÈGLE** : Déployer UNIQUEMENT via `npx vercel --prod` (jamais via Git push)
- **⚠️ PROBLÈME** : Le repo Git était connecté à Vercel → les push cassaient la prod. Il faut déconnecter Git de Vercel.

## Ce qui reste à faire

1. **CRITIQUE** : Corriger le .env.local (copier depuis art-core-final)
2. **CRITIQUE** : Déconnecter Git de Vercel et redéployer via CLI
3. Créer les tables Supabase (migration SQL dans art-core-final/supabase/migrations/)
4. Brancher la blockchain Polygon en mode réel (actuellement simulation)
5. Ajouter le micro/dictée vocale dans le formulaire certifier
6. Page DepartMer manquante dans la navigation

## Design

- Dark navy #0A1128 + Or #D4AF37
- Style Christie's (luxe sobre)
- Mobile-first, responsive
- "Certifié ✅" visible, zéro jargon blockchain

## Relation avec les autres apps

- **art-core-final** : App principale (marketplace) sur port 3000. Contient aussi une route /pass-core/certifier dans son architecture monorepo.
- **prime-core-final** : App paris/investissement sur port 3002
- Les 3 apps partagent la même base Supabase et les mêmes clés Stripe/Cloudinary
