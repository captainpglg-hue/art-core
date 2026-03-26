# ART-CORE — Guide de reprise pour AI

> Derniere mise a jour : 24 mars 2026
> Prepare par : Claude Code (Opus 4.6)

---

## 1. PRESENTATION DU PROJET

ART-CORE est un ecosysteme de 3 applications web pour le marche de l'art :

| App | URL | Role |
|-----|-----|------|
| **Art-Core** | art-core.app | Marketplace — acheter/vendre des oeuvres |
| **Pass-Core** | pass-core.art-core.app | Certification d'authenticite (photo macro + SHA-256) |
| **Prime-Core** | prime-core.art-core.app | Points, paris predictifs, leaderboard |

**Entite legale :** ART-CORE GROUP LTD — Companies House UK
**Fondateur :** Philippe Gigon Le Grain (PGLG)
**Lancement prevu :** 21 juin 2026 (Fete de la Musique)

---

## 2. STACK TECHNIQUE

```
Next.js 14 (App Router) + TypeScript
Supabase (PostgreSQL + Auth custom + Storage)
Stripe Connect (paiements + splits)
Cloudinary (images)
Tailwind CSS + shadcn/ui
Deploye sur Vercel
Domaine : art-core.app (Gandi)
```

### Structure du projet

```
C:\Users\User\art-core\
├── app/
│   ├── (art-core)/art-core/     # Marketplace (~30 pages)
│   ├── (pass-core)/pass-core/   # Certification (~7 pages)
│   ├── (prime-core)/prime-core/  # Points/paris (~9 pages)
│   ├── admin/                    # Back-office (~7 pages)
│   ├── auth/                     # Login, signup, onboarding
│   ├── api/                      # ~25 API routes
│   └── legal/                    # CGU
├── components/
│   ├── art-core/                 # ArtworkCard, Navbar, MobileBottomNav, etc.
│   ├── pass-core/                # PassNavbar, PassMobileNav, CertificationCamera
│   ├── ui/                       # shadcn/ui components
│   └── shared/                   # ArtworkIdentifier
├── lib/
│   ├── supabase/client.ts        # Client browser Supabase
│   ├── supabase/server.ts        # Client serveur + admin (service role)
│   ├── db.ts                     # TOUTES les queries DB (getArtworks, getUserByToken, confirmSale, etc.)
│   ├── auth.ts                   # getSessionUser() via cookie core_session
│   ├── stripe.ts                 # Stripe server + client + commissions
│   ├── royalties.ts              # MODELE ECONOMIQUE COMPLET (reference unique)
│   ├── macro-compatibility.ts    # Specs photo macro + smartphones compatibles
│   ├── cloudinary.ts             # Upload Cloudinary
│   ├── shipping.ts               # Tarifs livraison
│   └── utils.ts                  # formatPrice, formatDate, cn()
├── middleware.ts                  # Auth + routing sous-domaines
├── supabase/migrations/           # 7 fichiers SQL
├── scripts/setup-dns.js           # Config DNS Gandi automatique
├── tests/e2e/                     # Playwright (5 tests, tous passent)
├── public/
│   ├── icons/                     # PWA icons
│   ├── logos/                     # Logos SVG/PNG des 3 apps
│   └── manifest-*.json            # PWA manifests
└── .env.local                     # TOUTES les variables (voir section 4)
```

---

## 3. ARCHITECTURE AUTH

**PAS de Supabase Auth.** Systeme custom :
- Table `users` avec `password_hash` (bcrypt)
- Table `sessions` avec `token` + `expires_at`
- Cookie `core_session` (httpOnly, secure en prod)
- `lib/auth.ts` → `getSessionUser()` lit le cookie et cherche le user
- `lib/db.ts` → `getUserByToken()`, `createSession()`, `deleteSession()`
- `middleware.ts` → protege les routes qui commencent par `/art-core/checkout`, `/art-core/profile`, `/admin`, etc.

### Comptes test

| Email | Mot de passe | Role |
|-------|-------------|------|
| marie.test@passcore.io | Test1234! | artist |
| alex.test@passcore.io | Test1234! | ambassador |
| galerie.test@passcore.io | Test1234! | gallery |
| jean.test@passcore.io | Test1234! | client |
| artist@demo.com | password123 | artist |
| initie@demo.com | password123 | initiate |
| admin@artcore.com | password123 | admin |

---

## 4. VARIABLES D'ENVIRONNEMENT

Fichier `.env.local` (NE PAS commiter) :

```
NEXT_PUBLIC_SUPABASE_URL=https://kmmlwuwsahtzgzztcdaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...dcxk_X096vME37_XmeURhW-3bABcbkNC7qEXqYvXgcE
SUPABASE_SERVICE_ROLE_KEY=eyJ...BCE1ZfyTGk58Kdxt1N5I50_5s9JdL45x22XE6xLNFUc
SUPABASE_JWT_SECRET=b05ce38b-...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51TCuLD...
STRIPE_SECRET_KEY=sk_test_51TCuLD...
STRIPE_WEBHOOK_SECRET=whsec_aGqEGn...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=do2teddlo
CLOUDINARY_API_KEY=514638259542153
CLOUDINARY_API_SECRET=1DRL6r3...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Toutes les variables sont aussi sur Vercel (deja configurees).

---

## 5. BASE DE DONNEES SUPABASE

### Connexion
- URL : https://kmmlwuwsahtzgzztcdaj.supabase.co
- Dashboard : https://supabase.com/dashboard/project/kmmlwuwsahtzgzztcdaj
- 44 users, 129 artworks en base

### Tables principales

| Table | Role |
|-------|------|
| users | Utilisateurs (id, email, password_hash, role, points_balance, total_earned, is_initie) |
| sessions | Sessions auth (token, user_id, expires_at) |
| artworks | Oeuvres (title, artist_id, owner_id, price, status, photos, blockchain_hash, gauge_points) |
| transactions | Ventes (buyer_id, seller_id, amount, commission_platform) |
| notifications | Notifications in-app |
| gauge_entries | Points deposes par les inities sur les oeuvres |
| betting_markets | Marches predictifs |
| bets | Paris des utilisateurs |
| point_transactions | Historique des mouvements de points |
| pass_core_certifications | Certificats d'authenticite |
| messages | Messagerie entre utilisateurs |
| nova_accounts | Comptes Nova Bank |
| favorites | Favoris utilisateurs |
| promo_items / promo_purchases | Outils de promotion |
| referral_codes | Codes de parrainage |
| ownership_history | Historique des proprietaires |

### Colonnes manquantes (a ajouter via SQL Editor Supabase)
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pass_core_plan TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pass_core_premium_until TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sale_number INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  bank_partner TEXT NOT NULL DEFAULT 'nova_bank',
  cpl_amount NUMERIC(10,2) DEFAULT 100,
  kit_cost NUMERIC(10,2) DEFAULT 15,
  margin_artcore NUMERIC(10,2) DEFAULT 50,
  provision_ambassadeurs NUMERIC(10,2) DEFAULT 35,
  status TEXT DEFAULT 'converted',
  premium_activated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Storage
- Bucket `artworks` (public) — photos de certification

---

## 6. MODELE ECONOMIQUE (lib/royalties.ts)

### Premiere vente
| Destinataire | Part |
|-------------|------|
| Artiste createur | 85% |
| Art-Core plateforme | 10% |
| Ambassadeur Pass-Core | 5% |

### Reventes (2eme+)
| Destinataire | Part |
|-------------|------|
| Vendeur (proprietaire) | 84% |
| Artiste royalty perpetuelle | 10% |
| Art-Core plateforme | 5% |
| Inities Prime-Core | 0.5% |
| Ambassadeur | 0.5% (revente 2), 0.25% (revente 3), 0% (revente 4+) |

### Multiplicateurs Inities
| Niveau | Multiplicateur | Condition |
|--------|---------------|-----------|
| Initie | x1.0 | Inscription |
| Actif | x1.25 | 10 paris gagnes |
| Expert | x1.5 | 50 paris gagnes |
| Maitre | x2.0 | 200 paris gagnes |
| Legendaire | x3.0 | 500 paris gagnes |

Bonus prediction exacte (+/-5% du prix reel) : x3

---

## 7. FLUX CRITIQUES

### Achat d'oeuvre
1. User clique "Acheter maintenant" sur fiche oeuvre
2. → Redirect `/art-core/checkout?artwork=ID`
3. Formulaire adresse + zone livraison
4. `POST /api/stripe/payment-intent` → cree PaymentIntent
5. Stripe Elements (CardElement) → paiement
6. `POST /api/sale/confirm` → distribution royalties via `lib/royalties.ts`
7. → Redirect `/art-core/checkout/success`

### Certification Pass-Core
1. User ouvre `/pass-core/certifier`
2. Remplit titre, technique, dimensions, prix
3. Prend photo vue globale (getUserMedia ou input file)
4. Selectionne zone macro sur l'image
5. Camera live s'ouvre → capture macro avec analyse qualite temps reel
6. Hash SHA-256 calcule cote client
7. `POST /api/certification` → insert artwork + pass_core_certifications
8. Oeuvre apparait sur marketplace Art-Core
9. Email envoye avec certificat (si Resend configure)

### Routing sous-domaines (middleware.ts)
- `pass-core.art-core.app/*` → rewrite vers `/pass-core/*`
- `prime-core.art-core.app/*` → rewrite vers `/prime-core/*`
- `art-core.app/` → rewrite vers `/art-core`

---

## 8. CE QUI FONCTIONNE (teste)

- [x] Auth login/signup avec sessions custom
- [x] Marketplace avec donnees Supabase reelles
- [x] Fiche oeuvre avec details, jauge, prix
- [x] Bouton Acheter visible pour tous (pas de restriction artiste)
- [x] Checkout Stripe avec PaymentIntent
- [x] Certification Pass-Core avec camera + SHA-256
- [x] Upload photos vers Supabase Storage
- [x] Distribution royalties via lib/royalties.ts
- [x] Navigation mobile 5 onglets (Art-Core et Pass-Core)
- [x] Page profil avec liens secondaires
- [x] Nova Bank parrainage
- [x] DNS configures (art-core.app, pass-core.art-core.app, prime-core.art-core.app)
- [x] PWA installable
- [x] Tests Playwright 5/5

---

## 9. CE QUI RESTE A FAIRE

### Priorite haute
- [ ] Ajouter colonnes manquantes dans Supabase (wallet_balance, partnerships — voir section 5)
- [ ] Configurer Stripe Webhooks pour confirmer paiements automatiquement
- [ ] Tester flux achat reel de bout en bout sur mobile
- [ ] Camera macro : tester sur differents Xiaomi (freezes possibles en PWA)
- [ ] Configurer Resend pour envoi emails (RESEND_API_KEY)
- [ ] SSL automatique sur art-core.app (Vercel le fait, verifier)

### Priorite moyenne
- [ ] Admin : valider/refuser certifications
- [ ] Stripe Connect : onboarding artistes (compte Express)
- [ ] Wallet page avec historique des transactions et solde reel
- [ ] Recherche avancee avec filtres (categorie, prix, technique)
- [ ] Systeme de favoris fonctionnel
- [ ] Messagerie temps reel (Supabase Realtime)

### Priorite basse
- [ ] Google/GitHub OAuth login
- [ ] Notifications push (Web Push API)
- [ ] Mode hors-ligne PWA (service worker cache)
- [ ] Tests E2E complets (achat, certification, wallet)
- [ ] Analytics / tracking
- [ ] SEO meta tags dynamiques

---

## 10. CONVENTIONS DE CODE

- **Langue code** : anglais (variables, fonctions)
- **Langue UI** : francais (textes affiches)
- **Pas d'accents** dans le code ni les textes UI (problemes d'encodage)
- **shadcn/ui** pour les composants de base (Button, Input, Label, Badge, etc.)
- **Tailwind** : dark theme, couleurs principales `#D4AF37` (or), `#0A1128` (navy), `#0a0a0a` (noir)
- **Pas de jargon blockchain** visible par l'utilisateur : "Certifie" pas "SHA-256 verified"
- **UX Vinted** : simple, 3 clics max, bouton Acheter gros et visible
- **Chaque app** a sa propre navigation mobile en bas

---

## 11. COMMANDES UTILES

```bash
# Dev
npm run dev

# Build
npm run build

# Deploy
npx vercel --prod --yes

# Tests
npx playwright test tests/e2e/critical-flows.spec.ts

# DNS Gandi (necessite API key)
node scripts/setup-dns.js VOTRE_CLE_API_GANDI

# Vercel env vars
npx vercel env ls
```

---

## 12. CREDENTIALS ET ACCES

| Service | Acces |
|---------|-------|
| Supabase | https://supabase.com/dashboard/project/kmmlwuwsahtzgzztcdaj |
| Vercel | https://vercel.com (compte captainpglg) |
| Stripe | https://dashboard.stripe.com (mode test) |
| Cloudinary | https://cloudinary.com (do2teddlo) |
| Gandi | https://admin.gandi.net (PGLG) |
| Gandi API | Cle dans l'organisation PGLG > Personal Access Tokens |

---

## 13. PHILOSOPHIE

> Esthetique Christie's (dark luxury, or et navy)
> Fonctionnel Vinted (3 clics max, zero friction)
> Zero jargon blockchain visible
> "Certifie ✅" pas "SHA-256 verified"
> Tout le monde peut acheter, pas de restrictions artificielles
> Chaque app a son acces direct (sous-domaine)
> Automatiser plutot que donner des instructions manuelles
