/**
 * ============================================================================
 * resolve-photo.ts — Normalisation unifiee des URLs de photos d'oeuvres.
 *
 * CONTEXTE
 * --------
 * La colonne `artworks.photos` (Postgres TEXT[]) a ete remplie au fil des semaines
 * par plusieurs chemins (certify mobile, POST /api/artworks, scripts de seed,
 * migrations, imports Cloudinary/Unsplash/placehold.co, base64 data URIs, etc.).
 * Les formats historiques rencontres :
 *
 *   - URL absolue https://... (Supabase Storage, Cloudinary, Unsplash,
 *     placehold.co, picsum.photos) — OK tel quel si l'hote est whiteliste
 *     dans next.config.mjs.
 *   - Chemin local /uploads/xxx.jpg — CASSE en prod (Vercel serverless = pas
 *     de filesystem persistant), doit retomber sur le placeholder.
 *   - data:image/... — OK, renvoye tel quel.
 *   - Chaine vide, null, undefined, NaN, tableau vide — placeholder.
 *   - Chaine JSON-encodee (legacy) comme '["https://..."]' — parse et traite
 *     chaque element.
 *   - Tout le reste (segments relatifs non absolus hors /uploads, garbage)
 *     — placeholder.
 *
 * Cette fonction est 100% cote client/server (pas de I/O), pure, idempotente.
 * Elle ne fait PAS de requete reseau pour verifier l'existence du fichier.
 * ============================================================================
 */

export const PLACEHOLDER_ART = "/placeholder-art.jpg";

/**
 * Normalise une valeur brute venant de la colonne `photos` en une URL
 * affichable dans <Image> ou <img>.
 *
 * Strategie :
 *   1. Vide/null/undefined/non-string -> placeholder.
 *   2. data:image/...  -> tel quel.
 *   3. http(s)://...   -> tel quel (la whitelist next.config.mjs gerera).
 *   4. /uploads/...    -> placeholder (fichier volatil, inexistant sur Vercel).
 *   5. / qui commence par / MAIS n'est pas /uploads (ex: /placeholder-art.jpg
 *      ou autre asset statique local) -> tel quel.
 *   6. Tout le reste (chaine sans schema, path relatif bizarre) -> placeholder.
 */
export function resolvePhotoUrl(raw: unknown): string {
  if (raw === null || raw === undefined) return PLACEHOLDER_ART;
  if (typeof raw !== "string") return PLACEHOLDER_ART;

  const s = raw.trim();
  if (s.length === 0) return PLACEHOLDER_ART;

  // data:image/png;base64,...
  if (s.startsWith("data:image/")) return s;

  // URLs absolues — on fait confiance a la whitelist next.config.mjs. Si l'hote
  // n'est pas whiteliste, Next.js <Image> plantera mais on aura quand meme
  // tente d'afficher (ce qui est mieux que tout systematiquement placeholder).
  if (s.startsWith("https://") || s.startsWith("http://")) return s;

  // Paths locaux historiques /uploads/xxx.jpg — le filesystem Vercel est
  // ephemere. Ces fichiers n'existent pas en prod. Fallback explicite.
  if (s.startsWith("/uploads/") || s.startsWith("uploads/")) {
    return PLACEHOLDER_ART;
  }

  // Autres assets statiques locaux (ex: /placeholder-art.jpg lui-meme).
  if (s.startsWith("/")) return s;

  // Rien de reconnu.
  return PLACEHOLDER_ART;
}

/**
 * Normalise l'entree `photos` (peut etre un tableau natif TEXT[], une chaine
 * JSON-encodee legacy, null, undefined) en un tableau d'URLs affichables.
 *
 * - Si aucune photo valide n'est trouvee, retourne [PLACEHOLDER_ART] afin que
 *   les callers qui font `photos[0]` obtiennent toujours quelque chose de
 *   renderable.
 * - Les elements resolus au placeholder SONT retires (sinon on afficherait 4
 *   rectangles gris au lieu d'un). Si tout est casse, on garde 1 placeholder.
 */
export function resolveAllPhotos(
  raw: string[] | string | null | undefined
): string[] {
  let arr: unknown[] = [];

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string" && raw.length > 0) {
    // Legacy : chaine JSON-encodee venant d'anciens INSERTs qui faisaient
    // JSON.stringify(photos) avant qu'on passe en TEXT[] natif.
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
      else arr = [raw]; // Chaine simple non-JSON, on la traite comme un elem.
    } catch {
      // Pas du JSON — traiter comme un element unique.
      arr = [raw];
    }
  }

  const resolved = arr
    .map(resolvePhotoUrl)
    .filter((url) => url !== PLACEHOLDER_ART);

  if (resolved.length === 0) return [PLACEHOLDER_ART];
  return resolved;
}

/**
 * Retourne uniquement la premiere URL exploitable, avec fallback sur le
 * placeholder. Pratique pour les vignettes qui ne veulent qu'une photo.
 */
export function resolveFirstPhoto(
  raw: string[] | string | null | undefined
): string {
  const all = resolveAllPhotos(raw);
  return all[0] ?? PLACEHOLDER_ART;
}
