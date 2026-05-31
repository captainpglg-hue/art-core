import { describe, it, expect } from "vitest";
import {
  buildFilterQs,
  convertPlaceholders,
  parseWhere,
  splitCommasNotInParens,
} from "../sql-translator";

// ============================================================================
// Première vague de tests unitaires art-core.
// Cible : le translator SQL → PostgREST de lib/db.ts, mécanique fragile
// responsable des bugs récurrents « filtre ignoré » / colonne mal traduite.
// 100 % pur : aucun réseau, aucune env, aucune connexion DB.
// ============================================================================

describe("convertPlaceholders", () => {
  it("numérote les placeholders ? en $1, $2, …", () => {
    expect(convertPlaceholders("SELECT * FROM t WHERE a = ? AND b = ?")).toBe(
      "SELECT * FROM t WHERE a = $1 AND b = $2"
    );
  });

  it("ne touche pas aux ? à l'intérieur d'une chaîne quotée", () => {
    expect(convertPlaceholders("SELECT * FROM t WHERE label = 'a?b' AND x = ?")).toBe(
      "SELECT * FROM t WHERE label = 'a?b' AND x = $1"
    );
  });

  it("préserve les opérateurs jsonb ?? ?| ?&", () => {
    expect(convertPlaceholders("SELECT * FROM t WHERE data ?? ? AND meta ?| ?")).toBe(
      "SELECT * FROM t WHERE data ?? $1 AND meta ?| $2"
    );
  });

  it("ignore les ? dans un commentaire ligne --", () => {
    expect(convertPlaceholders("SELECT 1 -- est-ce ? oui\nWHERE a = ?")).toBe(
      "SELECT 1 -- est-ce ? oui\nWHERE a = $1"
    );
  });

  it("gère les apostrophes échappées '' sans décaler la numérotation", () => {
    expect(convertPlaceholders("WHERE name = 'O''Brien' AND id = ?")).toBe(
      "WHERE name = 'O''Brien' AND id = $1"
    );
  });
});

describe("splitCommasNotInParens", () => {
  it("découpe sur les virgules de premier niveau", () => {
    expect(splitCommasNotInParens("?, ?, 'lit'")).toEqual(["?", "?", "'lit'"]);
  });

  it("ne découpe pas les virgules à l'intérieur des parens", () => {
    expect(splitCommasNotInParens("?, COALESCE(a, b), NOW()")).toEqual([
      "?",
      "COALESCE(a, b)",
      "NOW()",
    ]);
  });
});

describe("parseWhere", () => {
  it("mappe une égalité avec placeholder vers le param fourni", () => {
    expect(parseWhere("token = ?", ["abc"])).toEqual({ token: "abc" });
  });

  it("supporte les AND chainés", () => {
    expect(parseWhere("artist_id = ? AND status = ?", ["u1", "available"])).toEqual({
      artist_id: "u1",
      status: "available",
    });
  });

  it("retire le préfixe d'alias de table (a.col -> col)", () => {
    expect(parseWhere("a.id = ?", ["x"])).toEqual({ id: "x" });
  });

  it("convertit un littéral numérique en nombre", () => {
    expect(parseWhere("count = 42", [])).toEqual({ count: 42 });
  });

  it("dénude les guillemets d'un littéral chaîne", () => {
    expect(parseWhere("status = 'sold'", [])).toEqual({ status: "sold" });
  });

  it("respecte startIdx pour repartir au bon param (cas UPDATE … WHERE)", () => {
    // params[0..1] consommés par le SET, le WHERE démarre à l'index 2
    expect(parseWhere("id = ?", ["setA", "setB", "wid"], 2)).toEqual({ id: "wid" });
  });

  it("RÉGRESSION : une condition non reconnue est ignorée silencieusement", () => {
    // Documente le piège ligne `if (!cm) continue;` : un opérateur non géré
    // (ici `>`) ne lève pas d'erreur — le filtre disparaît. C'est la source
    // de classe de bug « filtres ignorés ». Si un jour on décide de throw,
    // ce test devra être mis à jour EN CONNAISSANCE de cause.
    expect(parseWhere("price > ?", [100])).toEqual({});
  });

  it("strip le AND … > NOW() en queue (géré côté REST autrement)", () => {
    expect(parseWhere("token = ? AND expires_at > NOW()", ["t"])).toEqual({ token: "t" });
  });
});

describe("buildFilterQs", () => {
  it("génère des égalités eq. encodées", () => {
    expect(buildFilterQs({ category: "peinture", status: "available" })).toBe(
      "category=eq.peinture&status=eq.available"
    );
  });

  it("traduit null en is.null (et non eq.null)", () => {
    expect(buildFilterQs({ sold_at: null })).toBe("sold_at=is.null");
  });

  it("URL-encode les valeurs (espaces, accents, &)", () => {
    expect(buildFilterQs({ title: "huile & or" })).toBe("title=eq.huile%20%26%20or");
  });
});
