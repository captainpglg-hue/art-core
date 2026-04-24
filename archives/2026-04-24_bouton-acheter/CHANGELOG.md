# 2026-04-24 — Ajout bouton Acheter sur page œuvre + checkout enrichi

## Pourquoi

Découverte lors du test flow antiquaire → acheteur du 24 avril :
- La page `/art-core/oeuvre/[id]` n'avait qu'un seul CTA : "Contacter l'artiste"
- La page `/art-core/checkout` était un placeholder "Paiement Stripe activé prochainement" sans aucune donnée d'achat
- Aucun chemin UX ne déclenchait /checkout depuis la marketplace

Résultat : Philippe ne pouvait pas valider de bout-en-bout le scénario "acheteur qui achète" en prévision du lancement du 21 juin.

## Ce qui a été fait

### 1. `app/(art-core)/art-core/oeuvre/[id]/page.tsx`

Remplacement du bouton unique "Contacter l'artiste" par une **grille 2 colonnes** :
- **Acheter** (bouton or `#C9A84C`) → `/art-core/checkout?artwork_id={id}`
- **Contacter** (outline) → `/art-core/messages?to={artist_id}&artwork={id}`

Les deux CTAs restent masqués si l'utilisateur est l'artiste lui-même OU si l'œuvre a le statut `sold`.

Icône : `ShoppingCart` (déjà importé depuis `lucide-react`, donc zéro dépendance nouvelle).

### 2. `app/(art-core)/art-core/checkout/page.tsx` — réécriture complète

Avant : page placeholder statique sans paramètres.

Après : page dynamique qui accepte `?artwork_id=...` et affiche :
- **Garde-fous** : redirect vers login si pas connecté, error si œuvre introuvable, error si déjà vendue, error si l'utilisateur essaie d'acheter sa propre œuvre.
- **Récap œuvre** : thumbnail + titre + artiste + technique/dimensions + prix.
- **Détail transaction** : prix, part artiste 90%, commission plateforme 10%, total.
- **Bouton de paiement désactivé** : "Payer avec Stripe (intégration finale en cours)" avec icône cadenas.
- **Call-out** : "contacte l'artiste" (lien vers `/messages`) comme workaround tant que Stripe UI n'est pas câblé.
- **Garanties visuelles** : certifié Pass-Core, livraison sécurisée, retour 14 jours.

## Ce qui reste à faire pour un achat vraiment fonctionnel

1. Câbler le bouton "Payer avec Stripe" vers `/api/purchase` (route existante ou à créer) qui crée un `PaymentIntent` Stripe Connect avec split automatique 90/10.
2. Créer webhook handler `/api/webhooks/stripe` (les env vars `STRIPE_WEBHOOK_SECRET` et `STRIPE_PLATFORM_ACCOUNT_ID` sont déjà sur Vercel).
3. Au succès du paiement : update `artworks.status = sold`, `final_sale_price`, `buyer_id`, `sold_at`. Transférer la propriété (nouvelle entrée `ownership_transfers`).
4. Notification au vendeur + au scout si applicable.

## Fichiers archivés

- `oeuvre-page.tsx.after` — version modifiée de la page œuvre
- `checkout-page.tsx.after` — version réécrite de la page checkout

Pas de `.before` : les versions précédentes sont accessibles via `git show 2570c4b^:...` (avant commit art-core du 23) ou `d315b04:...` (dernier commit en cours).

## Rappel déploiement

```powershell
cd "C:\Users\Gigon Le Grain\Desktop\art-core"
git add -A
git commit -m "feat(art-core): bouton Acheter + page checkout avec récap artwork"
git push
npx vercel --prod --yes
```
