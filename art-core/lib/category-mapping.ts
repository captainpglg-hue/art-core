// Mapping affichage FR <-> enum DB EN
// L'enum Postgres artwork_category accepte UNIQUEMENT les valeurs EN suivantes :
//   painting, sculpture, photography, digital, drawing, printmaking,
//   mixed_media, installation, video, textile, ceramics, other
//
// Toute valeur user-facing FR doit transiter par categoryToDb() avant tout
// INSERT/UPDATE Postgres, sinon le check de l'enum echoue (22P02).

export const CATEGORY_FR_TO_EN: Record<string, string> = {
  "peinture": "painting",
  "sculpture": "sculpture",
  "photographie": "photography",
  "numerique": "digital",
  "dessin": "drawing",
  "gravure": "printmaking",
  "techniques_mixtes": "mixed_media",
  "installation": "installation",
  "video": "video",
  "textile": "textile",
  "ceramique": "ceramics",
  "autre": "other",
};

export const CATEGORY_EN_TO_FR: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_FR_TO_EN).map(([fr, en]) => [en, fr])
);

/**
 * Normalise une valeur de categorie (FR ou EN) vers la valeur enum DB EN.
 * Fallback "other" si valeur non reconnue (evite le crash 22P02 cote pg).
 */
export function categoryToDb(input: string | null | undefined): string {
  if (!input) return "other";
  const lower = input.toLowerCase().trim();
  if (CATEGORY_FR_TO_EN[lower]) return CATEGORY_FR_TO_EN[lower];
  if (Object.values(CATEGORY_FR_TO_EN).includes(lower)) return lower;
  return "other";
}

/** Convertit une valeur DB (EN) en libelle d'affichage FR. */
export function categoryToDisplay(dbValue: string | null | undefined): string {
  if (!dbValue) return "";
  return CATEGORY_EN_TO_FR[dbValue] ?? dbValue;
}
