/**
 * ============================================================================
 * resolve-photo.ts — Normalisation unifiee des URLs de photos d'oeuvres.
 *
 * Copie mirror de art-core/lib/resolve-photo.ts. Les deux apps partagent la
 * meme logique de normalisation pour rester visuellement coherentes.
 * Voir la doc du fichier original pour le detail des formats historiques.
 * ============================================================================
 */

export const PLACEHOLDER_ART = "/placeholder-art.jpg";

export function resolvePhotoUrl(raw: unknown): string {
  if (raw === null || raw === undefined) return PLACEHOLDER_ART;
  if (typeof raw !== "string") return PLACEHOLDER_ART;

  const s = raw.trim();
  if (s.length === 0) return PLACEHOLDER_ART;

  if (s.startsWith("data:image/")) return s;
  if (s.startsWith("https://") || s.startsWith("http://")) return s;

  if (s.startsWith("/uploads/") || s.startsWith("uploads/")) {
    return PLACEHOLDER_ART;
  }

  if (s.startsWith("/")) return s;

  return PLACEHOLDER_ART;
}

export function resolveAllPhotos(
  raw: string[] | string | null | undefined
): string[] {
  let arr: unknown[] = [];

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string" && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
      else arr = [raw];
    } catch {
      arr = [raw];
    }
  }

  const resolved = arr
    .map(resolvePhotoUrl)
    .filter((url) => url !== PLACEHOLDER_ART);

  if (resolved.length === 0) return [PLACEHOLDER_ART];
  return resolved;
}

export function resolveFirstPhoto(
  raw: string[] | string | null | undefined
): string {
  const all = resolveAllPhotos(raw);
  return all[0] ?? PLACEHOLDER_ART;
}
