// Tests unitaires de generateNumeroRom — exécutables avec node ou tsx.
// node --import tsx pass-core/lib/__tests__/numero-rom.test.ts
//
// On utilise simplement assert() pour ne dépendre d'aucun framework de test
// (pas de jest/vitest installé sur ce projet).
import assert from "node:assert/strict";
import { generateNumeroRom, isCanonicalNumeroRom, NUMERO_ROM_REGEX } from "../numero-rom";

const cases: { name: string; args: any; expected: string }[] = [
  // Cas nominal : ville complète + siret 14 chiffres
  {
    name: "nominal",
    args: { ville: "Paris", siret: "12345678907891", year: 2026 },
    expected: "2026-PAR-7891",
  },
  // Ville courte (2 lettres) → padding 'X'
  {
    name: "ville courte",
    args: { ville: "Le", siret: "00000000000123", year: 2026 },
    expected: "2026-LEX-0123",
  },
  // Ville et siret absents → fallback XXX/0000
  {
    name: "fallback absents",
    args: { ville: null, siret: null, year: 2026 },
    expected: "2026-XXX-0000",
  },
  // Accents diacritiques (Trévières → TRE)
  {
    name: "accents diacritiques",
    args: { ville: "Trévières", siret: "12345678908514", year: 2026 },
    expected: "2026-TRE-8514",
  },
  // Espaces dans le nom (LE PRADET → LEP) et siret avec espaces
  {
    name: "espaces et separators",
    args: { ville: "LE PRADET", siret: "123 456 789 01236", year: 2026 },
    expected: "2026-LEP-1236",
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const got = generateNumeroRom(c.args);
  try {
    assert.equal(got, c.expected);
    assert.equal(NUMERO_ROM_REGEX.test(got), true);
    assert.equal(isCanonicalNumeroRom(got), true);
    console.log(`  PASS — ${c.name}: ${got}`);
    pass++;
  } catch (e) {
    console.error(`  FAIL — ${c.name}: expected ${c.expected}, got ${got}`);
    fail++;
  }
}

// Cas de format invalides → isCanonicalNumeroRom doit retourner false
const invalid = ["ROM-1234", "2026-LE-0001", "26-PAR-1234", "2026-PAR-12", null, undefined, ""];
for (const v of invalid) {
  try {
    assert.equal(isCanonicalNumeroRom(v as any), false);
    console.log(`  PASS — invalide rejeté: ${v}`);
    pass++;
  } catch {
    console.error(`  FAIL — invalide accepté à tort: ${v}`);
    fail++;
  }
}

console.log(`\n${pass}/${pass + fail} tests PASS`);
process.exit(fail === 0 ? 0 : 1);
