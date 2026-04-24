# 2026-04-24 — Câblage complet du paiement Stripe

## Contexte

Suite à l'ajout du bouton Acheter, la page `/checkout` affichait un bouton "Payer avec Stripe" **désactivé** avec l'indication "intégration finale en cours". Les 4 variables d'env Stripe étant sur Vercel depuis 16 jours, il ne manquait que la plomberie code. Ce patch finit le travail.

## Ce qui est ajouté

### 1. `POST /api/purchase` — création du PaymentIntent

- Auth obligatoire (cookie `core_session`).
- Vérifie que l'artwork existe, est public+for_sale+not_sold, et que l'utilisateur n'en est pas l'artiste/owner.
- Crée un PaymentIntent Stripe via `createSimplePaymentIntent` (pas de Connect destination pour l'instant — on split en DB au webhook).
- Retourne `{ client_secret, payment_intent_id, amount_cents, currency }`.
- Gère proprement le cas `Stripe non configuré` (503) et la double-vente (409).

### 2. `POST /api/webhooks/stripe` — handler signé

- Vérifie la signature Stripe avec `STRIPE_WEBHOOK_SECRET`.
- Lit le body brut (`req.text()`) indispensable pour la vérification signature.
- Sur `payment_intent.succeeded` :
  - UPDATE `artworks` → `status='sold'`, `is_for_sale=false`, `buyer_id`, `owner_id=buyer_id`, `final_sale_price`, `sold_at`.
  - Idempotent : si l'artwork est déjà `sold`, retourne 200 sans rien faire.
  - INSERT dans `ownership_transfers` (historique) avec `stripe_payment_intent_id`.
  - INSERT 2 notifications (vendeur + acheteur) en best-effort.
- Sur `payment_intent.payment_failed` : log seulement, 200 retourné pour éviter les retries abusifs.
- Autres events : 200 avec `ignored: true`.

### 3. `checkout-client.tsx` — composant client Stripe Elements

- Au mount : POST `/api/purchase` → récupère `client_secret`.
- Monte `<Elements>` avec `clientSecret` et appearance navy+or.
- Formulaire avec `<PaymentElement />` (accepte carte, Apple Pay, Google Pay selon device).
- Gère le retour de redirect Stripe via `payment_intent_client_secret` dans l'URL → affiche confirmation avec bouton "Voir mes commandes".
- Messages d'erreur en rouge si échec.

### 4. `checkout/page.tsx` — intégration

- Import du `CheckoutClient` depuis `./checkout-client`.
- Check server-side `isStripeReady()` qui ne tire pas `lib/stripe.ts` (évite l'import transitif de `@stripe/stripe-js` côté server).
- Si Stripe prêt : affiche le formulaire Elements dans un cadre.
- Sinon : fallback "contacter l'artiste" (permet de dégrader gracieusement).

## Point d'attention — splits

Le code actuel utilise `createSimplePaymentIntent` : le paiement arrive en entier sur le compte plateforme, PAS avec transfer automatique vers un compte artiste Stripe Connect. Conséquence :
- Pour le MVP / lancement 21 juin : fonctionnel, l'artiste touchera sa part via virement manuel depuis le dashboard Stripe.
- Pour industrialiser : il faudra activer le flow Connect (chaque artiste crée un compte Express via `createConnectAccount`) et basculer sur `createArtworkPaymentIntent` qui fait le transfer automatique avec `application_fee_amount`.

Le bloc `lib/stripe.ts` contient déjà ces 2 helpers. Il ne manque que la route `/api/stripe/connect/onboarding` pour que les artistes complètent leur compte Stripe.

## Webhook Stripe — à configurer côté dashboard Stripe

Avant le 21 juin, Philippe doit enregistrer le webhook dans le dashboard Stripe :

1. Aller sur `https://dashboard.stripe.com/webhooks`
2. Add endpoint : `https://art-core.app/api/webhooks/stripe`
3. Events à écouter : `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copier le **signing secret** → le mettre dans Vercel sous `STRIPE_WEBHOOK_SECRET` (remplace le placeholder actuel si c'en est un).

## Fichiers livrés

- `app/api/purchase/route.ts` — nouveau
- `app/api/webhooks/stripe/route.ts` — nouveau
- `app/(art-core)/art-core/checkout/checkout-client.tsx` — nouveau
- `app/(art-core)/art-core/checkout/page.tsx` — modifié (intègre le client, retire le bouton désactivé)

## Fichiers archivés ici

- `purchase-route.ts`
- `webhook-stripe-route.ts`
- `checkout-client.tsx`
- `checkout-page.tsx.after`

## Rappel déploiement

```powershell
cd "C:\Users\Gigon Le Grain\Desktop\art-core"
git add -A
git commit -m "feat(art-core): Stripe paiement cable - /api/purchase + webhook + Elements"
git push
npx vercel --prod --yes
```

Après deploy, vérifier :
1. `art-core.app/art-core/oeuvre/<id>` → bouton Acheter
2. Cliquer Acheter → `/checkout?artwork_id=...` → formulaire Stripe Elements affiché
3. Tester avec carte test Stripe `4242 4242 4242 4242` (CVC et date futures)
4. Vérifier en DB que `artworks.status='sold'` après succès (déclenché par le webhook)
