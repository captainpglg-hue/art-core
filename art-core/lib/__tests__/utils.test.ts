import { describe, it, expect } from "vitest";
import { formatPrice, slugify, parsePhotos, truncate } from "../utils";

// ============================================================================
// Helpers purs de lib/utils.ts (affichage prix, slugs URL, parsing photos).
// formatPrice : les espaces de groupement fr-FR sont des espaces insécables
// (U+202F/U+00A0) → on normalise via \s avant assertion pour ne pas dépendre
// de la version d'ICU.
// ============================================================================

const norm = (s: string) => s.replace(/\s/g, " ");

describe("formatPrice", () => {
  it("formate en euros sans centimes", () => {
    expect(norm(formatPrice(1234))).toBe("1 234 €");
  });

  it("gère zéro", () => {
    expect(norm(formatPrice(0))).toBe("0 €");
  });

  it("arrondit (pas de décimales affichées)", () => {
    expect(norm(formatPrice(99.99))).toBe("100 €");
  });
});

describe("slugify", () => {
  it("met en kebab-case minuscule", () => {
    expect(slugify("Huile sur toile 2024")).toBe("huile-sur-toile-2024");
  });

  it("retire les accents", () => {
    expect(slugify("Été à Paris")).toBe("ete-a-paris");
  });

  it("remplace ponctuation/slash par un seul tiret et trim les bords", () => {
    expect(slugify("  A/B!!C  ")).toBe("a-b-c");
  });
});

describe("parsePhotos", () => {
  it("retourne tel quel un tableau", () => {
    expect(parsePhotos(["a", "b"])).toEqual(["a", "b"]);
  });

  it("parse une chaîne JSON tableau (legacy)", () => {
    expect(parsePhotos('["a","b"]')).toEqual(["a", "b"]);
  });

  it("retourne [] pour une chaîne non-JSON (pas de crash)", () => {
    expect(parsePhotos("pas du json")).toEqual([]);
  });

  it("retourne [] pour un JSON qui n'est pas un tableau", () => {
    expect(parsePhotos('{"x":1}')).toEqual([]);
  });

  it.each([null, undefined, 42, ""])("retourne [] pour %s", (input) => {
    expect(parsePhotos(input)).toEqual([]);
  });
});

describe("truncate", () => {
  it("ne touche pas une chaîne courte", () => {
    expect(truncate("court", 10)).toBe("court");
  });

  it("coupe et ajoute des points de suspension", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });
});
