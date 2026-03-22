# Art-Core — "Unveil the Unique"

Monorepo de l'écosystème **Core** — suite de 3 applications interconnectées pour le marché de l'art.

## Applications

| App | Slogan | Design | Description |
|-----|--------|--------|-------------|
| **PASS-CORE** | Authenticate the Real | Navy `#0A1128` + Or | Certification blockchain des œuvres |
| **ART-CORE** | Unveil the Unique | Dark `#121212` + Or | Marketplace achat / vente / location |
| **PRIME-CORE** | Stand the Unique Out | Fintech `#0D0F14` + Or | Scouting & royalties |

Les 3 apps partagent une base Supabase unique et un SSO commun.

---

## Stack

- **Framework** : Next.js 14 (App Router) + TypeScript
- **Base de données** : Supabase (PostgreSQL + Auth + Storage)
- **Paiements** : Stripe Connect (splits automatiques)
- **Images** : Cloudinary (HD + watermark)
- **UI** : Tailwind CSS + shadcn/ui + Lucide React
- **Graphiques** : Recharts
- **Mobile** : Expo / React Native (structure prévue)
- **Blockchain** : Simulation SHA-256 → upgrade Polygon/Base via viem

---

## Prérequis

- Node.js 20+
- pnpm (recommandé) ou npm
- Compte [Supabase](https://supabase.com)
- Compte [Stripe](https://stripe.com) avec Connect activé
- Compte [Cloudinary](https://cloudinary.com)

---

## Installation

```bash
# 1. Cloner le repo
git clone https://github.com/art-core-ltd/art-core.git
cd art-core

# 2. Installer les dépendances
pnpm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# → Remplir toutes les valeurs dans .env.local

# 4. Lancer Supabase en local (optionnel)
npx supabase start

# 5. Générer les types TypeScript depuis le schéma Supabase
pnpm db:types

# 6. Démarrer le serveur de développement
pnpm dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

---

## Variables d'environnement

Voir `.env.example` pour la liste complète. Variables critiques :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Structure du projet

```
art-core/
├── app/
│   ├── (hub)/                  # Portail central — navigation entre les 3 apps
│   ├── (pass-core)/            # Certification blockchain (navy)
│   ├── (art-core)/             # Marketplace (dark luxe)
│   ├── (prime-core)/           # Scouting & royalties (fintech)
│   ├── admin/                  # Panel admin
│   └── api/
│       ├── certify-artwork/    # POST — génère un Pass-Core
│       ├── purchase/           # POST — crée un PaymentIntent Stripe
│       ├── place-bet/          # POST — enchère en temps réel
│       ├── generate-affiliate-link/  # POST — lien scout
│       ├── pass-core-status/   # GET — vérifie un Pass-Core
│       └── webhooks/
│           ├── stripe/         # Stripe Connect webhooks
│           └── blockchain/     # On-chain events
├── components/
│   ├── ui/                     # Design system commun (shadcn/ui)
│   ├── pass-core/              # Composants certification
│   ├── art-core/               # Composants marketplace
│   └── prime-core/             # Composants scouting/dashboard
├── lib/
│   ├── supabase.ts             # Client Supabase (browser + server + admin)
│   ├── stripe.ts               # Stripe Connect + calcul des splits
│   ├── cloudinary.ts           # Upload HD + watermark
│   └── blockchain.ts           # Simulation Pass-Core (→ viem production)
├── types/
│   └── index.ts                # Tous les types TypeScript du projet
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Architecture Pass-Core

Le **Pass-Core** est la propriété intellectuelle de Art-core LTD :

1. **Émission** — `/api/certify-artwork` génère un hash SHA-256 de l'œuvre + simule une transaction blockchain
2. **Verrouillage automatique** — lors d'une vente (`payment_intent.succeeded`), le Pass-Core se verrouille et un nouvel enregistrement est créé pour le nouveau propriétaire
3. **Vérification publique** — `/api/pass-core-status?id=PASS-xxx` expose le hash + le statut sans exposer les données sensibles

```
Artiste certifie → Pass actif
Vente → Pass LOCKED + Transfer Event + nouveau Pass pour l'acheteur
```

---

## Commission splits (Stripe Connect)

| Bénéficiaire | Taux | Exemple (1000€) |
|-------------|------|----------------|
| Vendeur | 90% | 900€ |
| Art-core LTD (plateforme) | 10% | 100€ |
| Royalty artiste (revente) | 5% | 50€ |
| Scout Prime-Core | 2% du fee | 2€ |

---

## Setup Stripe Webhooks (local)

```bash
# Installer Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copier le webhook secret affiché → STRIPE_WEBHOOK_SECRET dans .env.local
```

---

## Setup Cloudinary

Dans le dashboard Cloudinary, créer 2 upload presets :
- `art_core_artworks` — unsigned, folder `art-core/artworks`
- `art_core_avatars` — unsigned, folder `art-core/avatars`

---

## Commandes utiles

```bash
pnpm dev          # Serveur dev
pnpm build        # Build production
pnpm typecheck    # Vérification TypeScript
pnpm db:types     # Générer les types depuis Supabase
pnpm db:push      # Appliquer les migrations
pnpm db:reset     # Reset la base locale
```

---

## Mobile (Expo)

La structure mobile est prévue dans `/mobile` (à venir).
Les API routes Next.js servent également l'app mobile.

---

*Art-core LTD — "Unveil the Unique"*
