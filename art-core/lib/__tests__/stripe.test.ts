import { describe, it, expect } from "vitest";
import { calculateSplit, COMMISSION } from "../stripe";

// ============================================================================
// calculateSplit — CŒUR DU MODÈLE ÉCONOMIQUE (split d'argent réel).
// Modèle arbitré par Philippe (31/05/2026), Option A :
//   VENTE PRIMAIRE : 90% vendeur · 10% plateforme (rien d'autre).
//   REVENTE        : 75% vendeur · 15% plateforme · 5% Initiés · 5% royalties.
// Aligné sur /api/purchase/confirm (PLATFORM_FEE_RATE = 0.10 sur le primaire).
// ============================================================================

describe("COMMISSION (constantes)", () => {
  it("revente : 75 + 5 (Initiés) + 5 (royalties) + 15 (plateforme remainder) = 100", () => {
    expect(COMMISSION.SELLER + COMMISSION.INITIE_POOL + COMMISSION.ARTIST_ROYALTY).toBeCloseTo(0.85, 10);
  });
  it("primaire : plateforme 10%", () => {
    expect(COMMISSION.PRIMARY_PLATFORM).toBe(0.10);
  });
});

describe("calculateSplit — vente primaire (90 / 10)", () => {
  it("répartit 10 000 cents en 9000 vendeur / 1000 plateforme, sans pool ni royalties", () => {
    const s = calculateSplit(10000);
    expect(s.sellerNet).toBe(9000);
    expect(s.platform).toBe(1000);
    expect(s.initiePool).toBe(0);
    expect(s.artistRoyalty).toBe(0);
    expect(s.scout).toBe(0);
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
