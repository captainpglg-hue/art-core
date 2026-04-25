// ============================================================================
// lib/numero-rom.ts — Génération canonique du N° ROM
// Format : YYYY-XXX-NNNN
//   YYYY = année (4 chiffres)
//   XXX  = 3 premières lettres de la ville en majuscules, paddées avec X
//   NNNN = 4 derniers chiffres du SIRET, paddés avec 0
// Fallbacks : ville absente → "XXX", siret absent ou < 4 chiffres → "0000"
// ============================================================================

export interface GenerateNumeroRomArgs {
  ville?: string | null;
  siret?: string | null;
  year?: number;
}

export const NUMERO_ROM_REGEX = /^\d{4}-[A-Z]{3}-\d{4}$/;

export function generateNumeroRom(args: GenerateNumeroRomArgs): string {
  const year = args.year ?? new Date().getFullYear();
  const yyyy = String(year).padStart(4, "0").slice(-4);

  let villePrefix = "XXX";
  if (args.ville && args.ville.trim()) {
    const letters = args.ville.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .toUpperCase().replace(/[^A-Z]/g, "");
    if (letters.length > 0) {
      villePrefix = (letters + "XX").slice(0, 3);
    } else {
      console.warn(`[generateNumeroRom] fallback ville: aucune lettre extraite de "${args.ville}"`);
    }
  } else {
    console.warn(`[generateNumeroRom] fallback ville: ville=${args.ville}`);
  }

  let siretSuffix = "0000";
  if (args.siret) {
    const digits = String(args.siret).replace(/\D/g, "");
    if (digits.length >= 4) {
      siretSuffix = digits.slice(-4);
    } else {
      console.warn(`[generateNumeroRom] fallback siret: "${args.siret}" < 4 chiffres`);
    }
  } else {
    console.warn(`[generateNumeroRom] fallback siret: siret=${args.siret}`);
  }

  return `${yyyy}-${villePrefix}-${siretSuffix}`;
}

export function isCanonicalNumeroRom(value: string | null | undefined): boolean {
  return !!value && NUMERO_ROM_REGEX.test(value);
}
