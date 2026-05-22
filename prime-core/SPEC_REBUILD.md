# Prime-Core — Spec Rebuild (marché de prédiction)

> Document d'analyse — auteur : Claude Code (session autonome), date : 2026-05-22.
> **Ne pas modifier le code existant de prime-core sans validation explicite.**

## 1. Constat

Le code actuel de `prime-core/` implémente :
- un **wallet** de points,
- un **leaderboard** général,
- un système d'**affiliation** (referral_codes, affiliate_links),
- des **bons d'achat** promo.

La **spec produit** définit pourtant Prime-Core comme un **marché de prédiction** sur les œuvres d'art certifiées : on parie sur le délai ou le prix de revente d'une œuvre.

→ **Écart fonctionnel important.** Le wallet/affiliation existant pourrait rester comme couche transverse (monétisation), mais le cœur métier de Prime-Core est ailleurs.

## 2. Features cibles (6)

| # | Feature | Statut actuel |
|---|---|---|
| 1 | Création **auto** d'un marché à chaque mise en vente Art-Core (webhook artwork.listed) | ❌ Manuel uniquement |
| 2 | **Gating initiés** : seuls les users `role='initiate'` peuvent miser au-dessus d'un certain palier | ⚠️ Partiel (flag is_initie existant) |
| 3 | **Jauge 0 → 100** d'engouement (somme normalisée des paris YES / capacité du marché) | ⚠️ Existe en base (gauge_entries, 4 lignes) mais non câblée au front |
| 4 | **Vente garantie** : si la jauge atteint 100 avant deadline, Art-Core déclenche la vente à un buyer (initiate) | ❌ |
| 5 | **Redistribution 0,5 %** du prix de vente aux parieurs YES gagnants | ❌ |
| 6 | **Bons d'achat** créditables sur Art-Core comme gains alternatifs aux gains en cash | ✅ Partiel (promo_items) |

## 3. Architecture proposée

### Tables Supabase déjà présentes (à conserver/étendre)
- `betting_markets` (121 lignes) — schéma OK : `market_type ∈ {time, value}`, `total_yes_amount`, `total_no_amount`, `odds_*`, `status`, `threshold_*`.
- `bets` (5 lignes) — table des paris individuels (peu peuplée → tests).
- `gauge_entries` (4 lignes) — entrées de points par initié.
- `initiate_commissions` (0 lignes) — paiements aux initiés.
- `point_transactions` (26 lignes) — historique des mouvements de points.

### Tables à créer (drafts)
- `prediction_payouts` : pour chaque marché résolu, qui touche quoi (parieurs YES, redistribution 0,5%).
- `market_lifecycle_events` : audit du cycle (created → open → closed → resolved).
- `gauge_thresholds` : configuration par catégorie d'œuvre (palier de vente garantie).

### Webhooks Art-Core → Prime-Core
- `artwork.listed` → POST `/api/prime/markets/auto-create`
- `artwork.sold`   → POST `/api/prime/markets/resolve` (déclenche payouts + 0,5%)
- `artwork.delisted` → POST `/api/prime/markets/cancel` (refund paris)

### Routes API Prime-Core à créer
- `GET /api/markets` — liste paginée, filtres par status / type.
- `GET /api/markets/[id]` — détail + côtes en temps réel.
- `POST /api/markets/[id]/bet` — placer un pari (vérifier gating initié si > seuil).
- `POST /api/markets/[id]/resolve` — admin/cron, résout et déclenche payouts.
- `GET  /api/markets/[id]/gauge` — état de la jauge (websocket / SSE idéalement).
- `POST /api/webhooks/art-core/artwork-listed` — endpoint webhook signé.

## 4. Risques & dépendances

- **Régulation jeux d'argent** : un marché de prédiction sur des biens physiques est dans une zone grise juridique (ANJ en France). Bloquant tant que pas tranché.
- **Anti-manipulation** : un initié qui mise sur un marché et a un lien d'affiliation avec l'artiste = conflit d'intérêt évident. Besoin de règles d'exclusion.
- **Liquidité** : avec 5 paris seulement à ce jour, les marchés vont être très peu liquides en MVP — prévoir un market-maker automatique ou plafonner les positions.

## 5. Estimation effort

| Phase | Effort |
|---|---|
| Setup tables manquantes + RLS + types TS générés | 1–2 j |
| Webhooks art-core → prime-core (signés HMAC) | 2 j |
| Routes API marchés (CRUD + bet + resolve) | 3–4 j |
| Front : page marché + composant jauge + UI pari | 4–5 j |
| Cron de résolution + payouts + redistribution 0,5 % | 2–3 j |
| Tests E2E + audit anti-manipulation | 2–3 j |
| **Total** | **~ 2–3 semaines dev** |

## 6. Plan de migration suggéré

1. **Garder** le code wallet/affiliation/leaderboard existant — il devient une couche "loyalty" transverse.
2. **Ajouter** progressivement les routes `/api/markets/*` sans toucher à l'existant.
3. **Activer feature-flag** `PRIME_PREDICTION_MODE` en preview avant rollout prod.
4. **Décider plus tard** quoi faire du leaderboard (le garder comme "top parieurs" ?).
