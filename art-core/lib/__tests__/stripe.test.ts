import { describe, it, expect } from "vitest";
import { calculateSplit, COMMISSION } from "../stripe";

// ============================================================================
// calculateSplit — CŒUR DU MODÈLE ÉCONOMIQUE (split d'argent réel).
// Ces tests FIGENT le comportement actuel de lib/stripe.ts :
//   vente normale : 75% vendeur · 20% plateforme · 5% pool Initiés
//   revente       : + 5% royalties artiste, pris sur la part plateforme (→ 15%)
//
// ⚠️ INCOHÉRENCE BUSINESS À ARBITRER (signalée, NON corrigée ici) :
//   - lib/stripe.ts          → plateforme 20%
//   - /api/purchase/confirm  → plateforme 10% (PLATFORM_FEE_RATE = 0.10)
//   - art-core/CLAUDE.md     → « commission vente 25% »
//   Trois valeurs différentes. Le bon taux est une décision de Philippe.
//   Quand il sera tranché, mettre ces tests à jour EN CONNAISSANCE DE CAUSE.
// ============================================================================

describe("COMMISSION (constantes)", () => {
  it("somme vente normale = 100% (75 + 20 + 5)", () => {
    expect(COMMISSION.SELLER + COMMISSION.PLATFORM + COMMISSION.INITIE_POOL).toBeCloseTo(1, 10);
  });
});

describe("calculateSplit — vente normale", () => {
  it("répartit 10 000 cents en 7500 / 2000 / 500", () => {
    const s = calculateSplit(10000);
    expect(s.sellerNet).toBe(7500);
    expect(s.initiePool).toBe(500);
    expect(s.artistRoyalty).toBe(0);
    expect(s.platform).toBe(2000);
  });

  it("expose l'alias legacy scout = initiePool", () => {
    const s = calculateSplit(10000);
    expect(s.scout).toBe(s.initiePool);
  });
});

describe("calculateSplit — revente (royalties artiste)", () => {
  it("prélève 5% royalties sur la part plateforme (→ 15%)", () => {
    const s = calculateSplit(10000, true);
    expect(s.sellerNet).toBe(7500);
    expect(s.initiePool).toBe(500);
    expect(s.artistRoyalty).toBe(500);
    expect(s.platform).toBe(1500); // 2000 − 500 royalties
  });
});

describe("calculateSplit — invariant de conservation (zéro centime perdu)", () => {
  it.each([1, 99, 100, 333, 9999, 123456, 1])("la somme des parts == montant (%i cents, vente)", (amt) => {
    const s = calculateSplit(amt);
    expect(s.sellerNet + s.initiePool + s.artistRoyalty + s.platform).toBe(amt);
  });

  it.each([1, 99, 333, 9999, 123457])("la somme des parts == montant (%i cents, revente)", (amt) => {
    const s = calculateSplit(amt, true);
    expect(s.sellerNet + s.initiePool + s.artistRoyalty + s.platform).toBe(amt);
  });

  it("ne crée jamais de part négative sur petit montant (1 cent)", () => {
    const s = calculateSplit(1, true);
    expect(s.platform).toBeGreaterThanOrEqual(0);
    expect(s.sellerNet).toBeGreaterThanOrEqual(0);
  });
});
