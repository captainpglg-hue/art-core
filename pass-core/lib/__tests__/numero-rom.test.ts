import { describe, it, expect } from "vitest";
import { generateNumeroRom, isCanonicalNumeroRom, NUMERO_ROM_REGEX } from "../numero-rom";

// ============================================================================
// generateNumeroRom (pass-core) — N° de registre de police, format légal LBC §5.
// Converti depuis l'ancien script node:assert/process.exit vers vitest pour
// intégrer le runner (le process.exit cassait la suite vitest).
// ============================================================================

describe("generateNumeroRom", () => {
  it.each([
    ["nominal", { ville: "Paris", siret: "12345678907891", year: 2026 }, "2026-PAR-7891"],
    ["ville courte (padding X)", { ville: "Le", siret: "00000000000123", year: 2026 }, "2026-LEX-0123"],
    ["fallback ville+siret absents", { ville: null, siret: null, year: 2026 }, "2026-XXX-0000"],
    ["accents (Trévières → TRE)", { ville: "Trévières", siret: "12345678908514", year: 2026 }, "2026-TRE-8514"],
    ["espaces + séparateurs siret", { ville: "LE PRADET", siret: "123 456 789 01236", year: 2026 }, "2026-LEP-1236"],
  ])("%s", (_name, args, expected) => {
    const got = generateNumeroRom(args as any);
    expect(got).toBe(expected);
    expect(NUMERO_ROM_REGEX.test(got)).toBe(true);
    expect(isCanonicalNumeroRom(got)).toBe(true);
  });
});

describe("isCanonicalNumeroRom — rejette les formats invalides", () => {
  it.each(["ROM-1234", "2026-LE-0001", "26-PAR-1234", "2026-PAR-12", null, undefined, ""])(
    "rejette %s",
    (value) => {
      expect(isCanonicalNumeroRom(value as any)).toBe(false);
    }
  );
});
