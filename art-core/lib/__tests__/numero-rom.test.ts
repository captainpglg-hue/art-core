import { describe, it, expect } from "vitest";
import { generateNumeroRom, isCanonicalNumeroRom, NUMERO_ROM_REGEX } from "../numero-rom";

// ============================================================================
// generateNumeroRom — N° de registre de police (format légal LBC §5).
// Format : YYYY-XXX-NNNN. Un format invalide = fiche police rejetée.
// 100 % pur.
// ============================================================================

describe("generateNumeroRom — cas nominal", () => {
  it("compose année-ville(3)-siret(4 derniers)", () => {
    expect(generateNumeroRom({ ville: "Paris", siret: "12345678901234", year: 2026 }))
      .toBe("2026-PAR-1234");
  });

  it("produit toujours un format canonique", () => {
    const n = generateNumeroRom({ ville: "Lyon", siret: "98765432100019", year: 2026 });
    expect(isCanonicalNumeroRom(n)).toBe(true);
  });
});

describe("generateNumeroRom — ville", () => {
  it("retire accents et espaces (Saint-Étienne → SAI)", () => {
    expect(generateNumeroRom({ ville: "Saint-Étienne", siret: "00000000000001", year: 2026 }))
      .toBe("2026-SAI-0001");
  });

  it("pad avec X si la ville fait < 3 lettres (Le → LEX)", () => {
    expect(generateNumeroRom({ ville: "Le", siret: "00000000000009", year: 2026 }))
      .toBe("2026-LEX-0009");
  });

  it("fallback XXX si ville absente", () => {
    expect(generateNumeroRom({ ville: null, siret: "00000000001234", year: 2026 }))
      .toBe("2026-XXX-1234");
  });

  it("fallback XXX si ville sans aucune lettre (123)", () => {
    expect(generateNumeroRom({ ville: "123", siret: "00000000001234", year: 2026 }))
      .toBe("2026-XXX-1234");
  });
});

describe("generateNumeroRom — siret", () => {
  it("ne garde que les chiffres puis les 4 derniers", () => {
    expect(generateNumeroRom({ ville: "Paris", siret: "123 456 789 06789", year: 2026 }))
      .toBe("2026-PAR-6789");
  });

  it("fallback 0000 si siret absent", () => {
    expect(generateNumeroRom({ ville: "Paris", siret: null, year: 2026 }))
      .toBe("2026-PAR-0000");
  });

  it("fallback 0000 si siret a moins de 4 chiffres", () => {
    expect(generateNumeroRom({ ville: "Paris", siret: "12", year: 2026 }))
      .toBe("2026-PAR-0000");
  });
});

describe("generateNumeroRom — année", () => {
  it("pad l'année sur 4 chiffres", () => {
    expect(generateNumeroRom({ ville: "Paris", siret: "00000000001234", year: 999 }))
      .toBe("0999-PAR-1234");
  });
});

describe("isCanonicalNumeroRom", () => {
  it("accepte un format valide", () => {
    expect(isCanonicalNumeroRom("2026-PAR-1234")).toBe(true);
  });

  it.each([
    ["2026-PA-1234", "ville 2 lettres"],
    ["2026-PARIS-1234", "ville 5 lettres"],
    ["26-PAR-1234", "année 2 chiffres"],
    ["2026-par-1234", "ville minuscule"],
    ["2026-PAR-123", "siret 3 chiffres"],
    ["garbage", "n'importe quoi"],
  ])("rejette %s (%s)", (value) => {
    expect(isCanonicalNumeroRom(value)).toBe(false);
  });

  it("rejette null / undefined / vide", () => {
    expect(isCanonicalNumeroRom(null)).toBe(false);
    expect(isCanonicalNumeroRom(undefined)).toBe(false);
    expect(isCanonicalNumeroRom("")).toBe(false);
  });

  it("le regex exporté reste la source de vérité", () => {
    expect(NUMERO_ROM_REGEX.test("2026-PAR-1234")).toBe(true);
  });
});
