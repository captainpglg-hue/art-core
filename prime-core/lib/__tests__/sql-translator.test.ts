import { describe, it, expect } from "vitest";
import {
  buildFilterQs,
  convertPlaceholders,
  parseWhere,
  splitCommasNotInParens,
} from "../sql-translator";

// ============================================================================
// Tests unitaires prime-core — translator SQL → PostgREST (jumeau art-core).
// Mécanique fragile : fallback REST quand postgres-js échoue sur l'auth.
// 100 % pur : aucun réseau, aucune env, aucune connexion DB.
// ============================================================================

describe("convertPlaceholders", () => {
  it("numérote les placeholders ? en $1, $2, …", () => {
    expect(convertPlaceholders("SELECT * FROM bets WHERE user_id = ? AND market_id = ?")).toBe(
      "SELECT * FROM bets WHERE user_id = $1 AND market_id = $2"
    );
  });

  it("ne touche pas aux ? dans une chaîne quotée", () => {
    expect(convertPlaceholders("SELECT * FROM t WHERE label = 'a?b' AND x = ?")).toBe(
      "SELECT * FROM t WHERE label = 'a?b' AND x = $1"
    );
  });

  it("préserve les opérateurs jsonb ?? ?| ?&", () => {
    expect(convertPlaceholders("SELECT * FROM t WHERE data ?? ? AND meta ?| ?")).toBe(
      "SELECT * FROM t WHERE data ?? $1 AND meta ?| $2"
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

  it("ne découpe pas les virgules dans les parens", () => {
    expect(splitCommasNotInParens("?, COALESCE(a, b), NOW()")).toEqual(["?", "COALESCE(a, b)", "NOW()"]);
  });
});

describe("parseWhere", () => {
  it("mappe une égalité avec placeholder", () => {
    expect(parseWhere("market_id = ?", ["m1"])).toEqual({ market_id: "m1" });
  });

  it("supporte les AND chainés", () => {
    expect(parseWhere("user_id = ? AND result = ?", ["u1", "won"])).toEqual({
      user_id: "u1",
      result: "won",
    });
  });

  it("retire le préfixe d'alias (b.user_id -> user_id)", () => {
    expect(parseWhere("b.user_id = ?", ["x"])).toEqual({ user_id: "x" });
  });

  it("respecte startIdx (cas UPDATE … WHERE)", () => {
    expect(parseWhere("id = ?", ["setA", "wid"], 1)).toEqual({ id: "wid" });
  });

  it("RÉGRESSION : une condition non reconnue est ignorée silencieusement", () => {
    expect(parseWhere("amount > ?", [100])).toEqual({});
  });

  it("strip le AND … > NOW() en queue", () => {
    expect(parseWhere("token = ? AND expires_at > NOW()", ["t"])).toEqual({ token: "t" });
  });
});

describe("buildFilterQs", () => {
  it("génère des égalités eq. encodées", () => {
    expect(buildFilterQs({ market_id: "m1", result: "won" })).toBe(
      "market_id=eq.m1&result=eq.won"
    );
  });

  it("traduit null en is.null", () => {
    expect(buildFilterQs({ settled_at: null })).toBe("settled_at=is.null");
  });

  it("URL-encode les valeurs", () => {
    expect(buildFilterQs({ name: "a & b" })).toBe("name=eq.a%20%26%20b");
  });
});
