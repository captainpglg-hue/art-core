# Smart contracts — Art-Core ecosystem

> ⚠️ **DRAFT / SQUELETTES — non audités, non déployés.**
> Code fourni à titre d'architecture cible pour remplacer la simulation SHA256
> actuelle de Pass-Core par un vrai ancrage on-chain sur Polygon.

## Architecture

```
                ┌────────────────────────┐
                │   Pass-Core (Next.js)  │
                │  backend custodien     │
                └──────────┬─────────────┘
                           │
                  ethers.js / viem
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────┐
│PassportRegistry│  │PassportTransfer│  │PassportEvent │
│   (state)     │  │  (mutations)   │  │ (append log) │
└───────┬───────┘  └────────┬───────┘  └──────┬───────┘
        │                   │                 │
        └─────────┬─────────┴─────────┬───────┘
                  ▼                   ▼
        ┌──────────────────┐ ┌───────────────────┐
        │ PassportVerify   │ │ PassportAccess    │
        │  (read-only)     │ │ (RBAC / délégation)│
        └──────────────────┘ └───────────────────┘
```

- **Registry** : source de vérité (mapping fingerprintHash → Passport).
- **Transfer** : transferts de propriété, écrit dans Registry et Event.
- **Event** : journal append-only des 11 événements de la vie d'un objet.
- **Verify** : agrégateur read-only (façade pour le frontend public).
- **Access** : RBAC + délégations de lecture privée (experts certifiés).

## Variables d'env attendues côté backend

```env
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137
CUSTODIAN_PRIVATE_KEY=0x...                 # ⚠️ KMS / vault, jamais en clair
CONTRACT_PASSPORT_REGISTRY=0x...
CONTRACT_PASSPORT_TRANSFER=0x...
CONTRACT_PASSPORT_EVENT=0x...
CONTRACT_PASSPORT_VERIFY=0x...
CONTRACT_PASSPORT_ACCESS=0x...
```

## Étapes de déploiement

1. **Installer Hardhat** dans un nouveau dossier `contracts/hardhat/`
   ```bash
   npm init -y
   npm i -D hardhat @nomicfoundation/hardhat-toolbox
   npm i @openzeppelin/contracts
   npx hardhat init
   ```
2. **Tests unitaires** Hardhat — viser ≥ 95% coverage avant audit.
3. **Déploiement testnet Amoy** (Polygon testnet) — valider l'intégration
   end-to-end avec Pass-Core staging.
4. **Audit externe** — ChainSecurity, Trail of Bits, Hacken, OpenZeppelin Security.
   Budget : **5 000 € – 15 000 €** selon la profondeur.
5. **Déploiement mainnet Polygon** — coût estimé **~100 €** de gas pour les 5 contrats
   (avec gas ~ 30 gwei et MATIC à ~0,5 €).
6. **Multisig owner** — passer ownership des contrats à un Gnosis Safe 2-of-3
   ou 3-of-5 plutôt qu'une EOA.
7. **Maintenance** : monitoring des events via The Graph ou un indexer maison.

## Coût estimé global

| Poste | Coût |
|---|---|
| Audit externe | 5 000 € – 15 000 € (one-shot) |
| Déploiement mainnet | ~100 € de gas |
| Gas mensuel (1k events/mois) | ~30 € – 80 € |
| Indexer (Alchemy / The Graph hosted) | 0 € – 50 € / mois |

## Décisions encore ouvertes

- [ ] **Custodial vs self-custodial** : tant que les utilisateurs n'ont pas de wallet,
      le backend signe pour eux (custodial). À long terme : migrer vers Account Abstraction (ERC-4337).
- [ ] **Polygon vs Polygon zkEVM vs L2 plus jeune** : Polygon PoS est mature, frais OK.
- [ ] **Compression d'historique** : si très long, envisager IPFS + Merkle root on-chain.
