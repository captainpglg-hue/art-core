# Cahier des Charges Logique (LBC) — Écosystème Art-core

**Statut** : document de référence, soumis le 26 avril 2026 par Philippe.
**Portée** : architecture cible de l'écosystème complet (Passe Corps + Art-core + Prime Corps).
**Articulation avec l'ADR du 26 avril** : ce LBC complète l'ADR D1/D2/D3 (`2026-04-26-D1-D2-D3-architecture-decisions.md`) en posant la logique métier de bout en bout. L'ADR figeait trois choix structurants ; le LBC pose le périmètre fonctionnel cible et la séquence des transactions.

Le LBC ci-dessous est la spécification cible. La section finale "Analyse d'écart" liste ce qui est déjà implémenté, ce qui manque, et ce qui devra être respécifié.

---

## 1. Architecture des services (le triptyque)

L'application doit être développée comme une **API centrale** gérant trois interfaces front-end :

- **Passe Corps** : module de certification (Ambassadeurs).
- **Art-core** : module marketplace (vente / achat).
- **Prime Corps** : module marché de prédiction (paris).

---

## 2. Flux d'activation (trigger bancaire)

Point d'entrée unique. Aucun utilisateur ne peut agir sans la validation du compte.

- **Étape A — Statut PENDING** : l'utilisateur s'inscrit. Le système génère un `User_ID` et un lien d'affiliation bancaire unique via API (ex. Awin / Revolut).
- **Étape B — Le webhook** : la plateforme reçoit un signal (webhook) de la banque confirmant l'ouverture du compte.
- **Étape C — Statut ACTIVE** :
  - **Si profil ambassadeur** : déclenchement de l'ordre d'envoi du "kit macro" (API logistique) + activation du bouton "Certifier" dans l'app.
  - **Si profil scout** : injection de X points / jetons (bonus) dans le portefeuille virtuel `Bonus_Balance`.

---

## 3. Logique de certification (Passe Corps)

Le code doit garantir l'intégrité de la preuve avant l'inscription en blockchain.

- **Capture macro** : l'interface impose un cadre de focus. L'image doit être traitée localement pour vérifier la netteté (blur detection).
- **Metadata binding** : chaque photo doit être liée à `GPS_Coordinates` + `Timestamp` + `Ambassador_ID`.
- **Hashing** : génération d'une empreinte numérique unique de la texture.
- **Blockchain minting** : inscription sur une blockchain à bas coût (Polygon ou Solana) pour créer le certificat d'authenticité infalsifiable.

---

## 4. Logique de pari (Prime Corps)

C'est la zone à la plus forte exigence d'exactitude. Structure imposée :

### 4.1 Séparation des soldes

- `Wallet_Real` : retirable, alimenté par les gains de paris ou les ventes.
- `Wallet_Bonus` : non-retirable, alimenté par le parrainage bancaire.

### 4.2 Le pari (automated market maker)

- Définition des tranches de prix (par exemple 0–500 €, 501–1 000 €, etc.).
- Calcul de la cote selon la formule :

$$\text{Prix\_Part} = \frac{\text{Mises\_Tranche\_A}}{\text{Mises\_Totales}}$$

### 4.3 Résolution

Le pari se clôture **uniquement** par un signal venant d'Art-core (vente confirmée).

---

## 5. Algorithme de distribution (smart contract)

Lorsqu'une vente est validée sur Art-core (prix = P), le système doit exécuter la répartition suivante en **une seule transaction** :

1. **Artiste** : P × 80 %.
2. **Plateforme** : P × 10 %.
3. **Ambassadeur (Passe Corps)** : P × 5 % — royalties à vie sur revente.
4. **Scout (Prime Corps)** : P × 5 % — pool de redistribution pour les parieurs gagnants.

---

## 6. Scénarios "worst-case" à coder (sécurités)

### 6.1 Double certification

Si le hash d'une nouvelle photo macro correspond à 99 % à un hash existant → blocage immédiat + alerte fraude.

### 6.2 Annulation de vente

Si l'acheteur n'authentifie pas l'œuvre à la réception avec son kit → fonds bloqués en escrow (tiers de confiance).

### 6.3 Inactivité bancaire

Si le compte n'est pas activé sous 30 jours → suppression du compte utilisateur et recyclage du lien d'affiliation.

---

## Analyse d'écart avec le code au 26 avril 2026 (SHA `fc9f931`)

Cette section n'appartient pas au LBC original : elle confronte la cible aux briques déjà livrées.

### Ce qui est déjà conforme ou en place

- **Triptyque architectural** : trois apps coexistent dans le monorepo (`art-core/`, `pass-core/`, `prime-core/`). La séparation front-end est respectée.
- **Capture macro et hashing (§3)** : `lib/fingerprint.ts` calcule SHA-256 + MD5 + descripteur perceptuel `sharp` quand disponible. `lib/numero-rom.ts` génère un identifiant déterministe ville+SIRET. La pipeline existe, sans la liaison metadata GPS+Timestamp+AmbassadorID encore.
- **Endpoint atomique de dépôt** : `/api/deposit-with-signup` (art-core et pass-core) crée user + merchant + artwork + pass_core en une transaction logique, ce qui prépare le terrain pour la transaction unique du §5.
- **Fiche de police PDF** : générée automatiquement pour les rôles antiquaire / galeriste / brocanteur / dépôt-vente avec envoi email + fallback storage. Conforme aux exigences légales R.321-1 (côté art-core), pas exigé par le LBC mais cohérent avec le périmètre métier.

### Ce qui manque ou doit être respécifié

- **§2 trigger bancaire** : aucun statut PENDING / ACTIVE n'existe en DB aujourd'hui. Le signup est direct (cf. `app/api/auth/signup/route.ts`). Il faudra :
  - ajouter une colonne `users.account_status` enum `pending|active|suspended|expired` ;
  - créer un endpoint `/api/webhooks/banking-affiliation` (Awin ou Revolut) qui passe le user de pending à active ;
  - bloquer les actions sensibles (certifier, déposer, parier) tant que `account_status != active` ;
  - ajouter un job qui purge les comptes pending depuis plus de 30 jours (§6.3).
- **§3 metadata binding** : la liaison GPS + Timestamp + Ambassador_ID n'est pas encore enforced. À ajouter dans `/api/upload-photo` et dans le payload `artworks`. Champ `geolocation_capture` à introduire (table `artworks` ou table dédiée `capture_metadata`).
- **§3 blockchain minting réelle** : le code utilise actuellement `blockchain_network: "simulation"` (cf. `app/api/deposit-with-signup/route.ts` ligne ~204). Il faudra brancher Polygon ou Solana via une lib SDK (ethers + Polygon, ou @solana/web3.js). Décision technique à figer dans une ADR ultérieure (chaîne, contrat, gas funding).
- **§4 séparation Wallet_Real / Wallet_Bonus** : la table `wallet` actuelle (`/api/wallet`) ne distingue pas les deux soldes. Migration DB nécessaire :
  - renommer `points_balance` ou ajouter `bonus_balance` séparée ;
  - bloquer le retrait sur `bonus_balance` ;
  - éditer toutes les routes qui injectent des points pour cibler la bonne colonne.
- **§4.2 AMM par tranches de prix** : Prime Corps existe en dossier mais le marché de prédiction n'est pas codé. Spécification à produire avant implémentation (séquence de pari, cote dynamique, expiration).
- **§4.3 résolution par signal Art-core** : à câbler après §4.2. Le webhook interne sera émis par `app/api/sale/confirm/route.ts` ou `app/api/purchase/confirm/route.ts`.
- **§5 répartition 80/10/5/5** : aujourd'hui, le paiement Stripe arrive 100 % sur la plateforme (cf. CHANGELOG.md "Non publié"), redistribution manuelle. Il faut :
  - terminer l'onboarding Stripe Connect pour les artistes (déjà signalé comme priorité court terme) ;
  - implémenter la répartition en une seule transaction (utiliser `transfer_data[destination]` + `application_fee_amount` Stripe ou multi-charge) ;
  - tracer chaque part dans une table `revenue_splits` pour audit.
- **§6.1 double certification** : aucun check de similarité 99 % n'existe. À coder dans la pipeline `/api/upload-photo` ou `/api/certify` :
  - calcul du fingerprint sur la nouvelle photo ;
  - recherche de plus proche voisin dans la table des fingerprints existants ;
  - blocage + alerte si distance < seuil.
- **§6.2 escrow** : pas d'escrow Stripe configuré. Stripe propose `manual capture` + `transfer_group` ou `Connect destination charges` avec `on_behalf_of`. Spécification à produire (durée d'escrow, conditions de release, conditions de refund).
- **§6.3 purge inactivité** : pas de job programmé. À ajouter via `cron` Vercel ou `pg_cron` Supabase.

### Tensions avec le mode ART (ADR D3)

Le LBC ne mentionne pas explicitement les trois modes (TCG, VÉLO, ART) actés dans l'ADR D3. La logique de certification du §3 est compatible avec le mode TCG (capture macro standard). Le mode ART introduira en plus la carte ArUco et la base dense de patches (cf. ADR D1). Le mode VÉLO introduira les zones-cibles spécifiques au cadre. Le LBC reste donc le **socle commun** ; chaque mode ajoute sa couche `capture/strategy/`.

### Articulation avec les sessions à venir

Cette analyse d'écart définit la backlog exécutable :

- **Court terme (priorité 1)** : finir Stripe Connect + implémenter la répartition 80/10/5/5 + ajouter `account_status` et le webhook bancaire.
- **Court terme (priorité 2)** : ajouter le check de double certification 99 % et la purge des comptes pending > 30 jours.
- **Moyen terme** : brancher la blockchain réelle (Polygon ou Solana), construire le module Prime Corps complet (AMM, paris, résolution), implémenter l'escrow.
- **Long terme** : intégration ArUco mode ART (sessions H1, H2, H3 déjà cadrées dans l'ADR D3), démarrage TCG MVP (phase A) et VÉLO MVP (phase F) du RFC v2.2.

---

## Action côté code suite à ce LBC

Ce document n'impose aucune modification de code immédiate au-delà du fix identité déjà committé (`fc9f931`). Il oriente toutes les prochaines sessions Claude Code et fait foi pour départager les choix d'implémentation à venir.

Toute divergence entre ce LBC et une implémentation future doit être actée par une ADR, en référençant ce document.
