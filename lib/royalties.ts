// ═══════════════════════════════════════════════════════════════
// ART-CORE — Modele economique (reference unique)
// Toutes les regles de royalties, commissions et repartition
// ═══════════════════════════════════════════════════════════════

// ── Premiere vente ──────────────────────────────────────────
export const FIRST_SALE = {
  PLATFORM: 0.10,     // 10% Art-Core
  ARTIST: 0.85,       // 85% artiste createur
  AMBASSADOR: 0.05,   // 5% ambassadeur Pass-Core
  INITIATES: 0,       // 0% — pas d'inities sur 1ere vente
} as const;

// ── Reventes (2eme vente et suivantes) ─────────────────────
export const RESALE = {
  PLATFORM: 0.05,     // 5% Art-Core
  ARTIST_ROYALTY: 0.10, // 10% artiste — PERPETUELLE a vie
  SELLER: 0.84,       // 84% vendeur (proprietaire actuel)
  INITIATES: 0.005,   // 0.5% reparti selon points mises
} as const;

// ── Commission ambassadeur sur reventes ────────────────────
// Decroissante: 0.5% revente 2, 0.25% revente 3, 0% revente 4+
// OU 0% apres 5 ans depuis la 1ere vente (premier des deux)
export function getAmbassadorResaleRate(resaleNumber: number, firstSaleDate: Date): number {
  const yearsElapsed = (Date.now() - firstSaleDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (yearsElapsed >= 5) return 0;
  if (resaleNumber === 2) return 0.005;  // 0.5%
  if (resaleNumber === 3) return 0.0025; // 0.25%
  return 0; // revente 4+
}

// ── Multiplicateurs Inities ────────────────────────────────
export const INITIATE_LEVELS = [
  { name: "Initie",    multiplier: 1.0,  winsRequired: 0 },
  { name: "Actif",     multiplier: 1.25, winsRequired: 10 },
  { name: "Expert",    multiplier: 1.5,  winsRequired: 50 },
  { name: "Maitre",    multiplier: 2.0,  winsRequired: 200 },
  { name: "Legendaire", multiplier: 3.0, winsRequired: 500 },
] as const;

export function getInitiateLevel(winsCount: number) {
  let level: (typeof INITIATE_LEVELS)[number] = INITIATE_LEVELS[0];
  for (const l of INITIATE_LEVELS) {
    if (winsCount >= l.winsRequired) level = l;
  }
  return level;
}

// ── Bonus prediction exacte ────────────────────────────────
// Si prediction a +/- 5% du prix reel → multiplicateur ×3
export const PREDICTION_BONUS_THRESHOLD = 0.05; // 5%
export const PREDICTION_BONUS_MULTIPLIER = 3;

export function hasPredictionBonus(predictedPrice: number, actualPrice: number): boolean {
  const diff = Math.abs(predictedPrice - actualPrice) / actualPrice;
  return diff <= PREDICTION_BONUS_THRESHOLD;
}

// ── Calcul repartition premiere vente ──────────────────────
export function calculateFirstSale(priceEuros: number) {
  const platform = Math.round(priceEuros * FIRST_SALE.PLATFORM * 100) / 100;
  const artist = Math.round(priceEuros * FIRST_SALE.ARTIST * 100) / 100;
  const ambassador = Math.round(priceEuros * FIRST_SALE.AMBASSADOR * 100) / 100;
  return { platform, artist, ambassador, initiates: 0, total: priceEuros };
}

// ── Calcul repartition revente ─────────────────────────────
export function calculateResale(
  priceEuros: number,
  resaleNumber: number,
  firstSaleDate: Date,
) {
  const platform = Math.round(priceEuros * RESALE.PLATFORM * 100) / 100;
  const artistRoyalty = Math.round(priceEuros * RESALE.ARTIST_ROYALTY * 100) / 100;
  const seller = Math.round(priceEuros * RESALE.SELLER * 100) / 100;
  const initiatesPool = Math.round(priceEuros * RESALE.INITIATES * 100) / 100;
  const ambassadorRate = getAmbassadorResaleRate(resaleNumber, firstSaleDate);
  const ambassador = Math.round(priceEuros * ambassadorRate * 100) / 100;

  return { platform, artistRoyalty, seller, initiatesPool, ambassador, total: priceEuros };
}

// ── Repartition pool Inities ───────────────────────────────
export interface InitiateStake {
  userId: string;
  pointsStaked: number;
  winsCount: number;
  predictedPrice?: number;
}

export function distributeInitiatesPool(
  pool: number,
  stakes: InitiateStake[],
  actualPrice?: number,
) {
  if (stakes.length === 0 || pool <= 0) return [];

  // Calcul du score pondere pour chaque initie
  const scored = stakes.map((s) => {
    const level = getInitiateLevel(s.winsCount);
    const baseScore = s.pointsStaked * level.multiplier;
    const hasBonus = actualPrice != null && s.predictedPrice != null
      ? hasPredictionBonus(s.predictedPrice, actualPrice)
      : false;
    const finalScore = hasBonus ? baseScore * PREDICTION_BONUS_MULTIPLIER : baseScore;
    return { ...s, level, baseScore, hasBonus, finalScore };
  });

  const totalScore = scored.reduce((sum, s) => sum + s.finalScore, 0);

  return scored.map((s) => ({
    userId: s.userId,
    share: totalScore > 0 ? Math.round((s.finalScore / totalScore) * pool * 100) / 100 : 0,
    level: s.level.name,
    multiplier: s.level.multiplier,
    hasBonus: s.hasBonus,
    score: s.finalScore,
  }));
}

// ── Abonnements Pass-Core ──────────────────────────────────
export const PASS_CORE_PLANS = {
  FREE: { name: "Gratuit", priceYear: 0, maxCertifications: 10 },
  PREMIUM: { name: "Premium", priceYear: 9.90, founderPrice: 4.95, maxCertifications: Infinity },
  AMBASSADOR_PRO: { name: "Ambassadeur Pro", priceYear: 29, maxCertifications: Infinity },
} as const;

// ── Modifications Pass-Core au coup par coup ───────────────
export const PASS_CORE_MODIFICATIONS = {
  UPDATE_LINK_PRICE: { label: "Mise a jour lien/prix", price: 2.90 },
  ADD_PROVENANCE: { label: "Ajout document provenance", price: 4.90 },
  CHANGE_OWNER: { label: "Changement de proprietaire", price: 9.90 },
  FIX_METADATA: { label: "Correction metadonnees", price: 1.90 },
} as const;

// ── Abonnements Galerie ────────────────────────────────────
export const GALLERY_PLANS = {
  STANDARD: { name: "Standard", priceMonth: 49, features: ["Modifications illimitees", "API donnees"] },
  PREMIUM: { name: "Premium", priceMonth: 149, features: ["Donnees anonymisees temps reel", "Export CSV"] },
  ENTERPRISE: { name: "Enterprise", priceMonth: 499, features: ["API complete", "White label certificat"] },
} as const;

// ── Outils promotion Prime-Core ────────────────────────────
export const PROMO_TOOLS = [
  { name: "Boost visibilite", points: 50, euros: 2.90 },
  { name: "Vitrine premium", points: 200, euros: 9.90 },
  { name: "Newsletter featured", points: 300, euros: 14.90 },
  { name: "Trending homepage", points: 500, euros: 19.90 },
  { name: "Vedette semaine", points: 1000, euros: 49 },
] as const;

// ── Parrainage Nova Bank ───────────────────────────────────
export const NOVA_BANK = {
  CPL_RECEIVED: 100,         // 100E recus de Nova Bank par compte ouvert
  KIT_COST: 15,              // 15E cout reel du kit macro
  MARGIN_ARTCORE: 50,        // 50E marge Art-Core
  PROVISION_AMBASSADORS: 35, // 35E provision ambassadeurs
} as const;

// ── Shipping rates ─────────────────────────────────────────
export const SHIPPING = {
  FR_LEVEL_1: { label: "France Niveau 1", price: 4.90, days: "3-5j" },
  FR_LEVEL_2: { label: "France Niveau 2", price: 19.90, days: "2-5j" },
  EU: { label: "Europe", price: 12.90, days: "3-10j" },
  INT: { label: "International", price: 39.90, days: "7-21j" },
} as const;
