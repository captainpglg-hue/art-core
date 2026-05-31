import { describe, it, expect } from "vitest";
import {
  buildFilterQs,
  convertPlaceholders,
  parseWhere,
  splitCommasNotInParens,
} from "../sql-translator";

// ============================================================================
// Tests unitaires pass-core — translator SQL → PostgREST (jumeau art-core).
// pass-core gère l'auth + la certification : le fallback REST sert sur
// /api/certify, /api/verify, sessions. 100 % pur (aucun réseau / env / DB).
// ============================================================================

describe("convertPlaceholders", () => {
  it("numérote les placeholders ? en $1, $2, …", () => {
    expect(convertPlaceholders("SELECT * FROM sessions WHERE token = ? AND user_id = ?")).toBe(
      "SELECT * FROM sessions WHERE token = $1 AND user_id = $2"
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
  it("mappe une égalité avec placeholder (token de session)", () => {
    expect(parseWhere("token = ?", ["abc"])).toEqual({ token: "abc" });
  });

  it("supporte les AND chainés", () => {
    expect(parseWhere("user_id = ? AND artwork_id = ?", ["u1", "a1"])).toEqual({
      user_id: "u1",
      artwork_id: "a1",
    });
  });

  it("retire le préfixe d'alias (u.id -> id)", () => {
    expect(parseWhere("u.id = ?", ["x"])).toEqual({ id: "x" });
  });

  it("respecte startIdx (cas UPDATE … WHERE)", () => {
    expect(parseWhere("id = ?", ["setA", "wid"], 1)).toEqual({ id: "wid" });
  });

  it("RÉGRESSION : une condition non reconnue est ignorée silencieusement", () => {
    expect(parseWhere("created_at > ?", ["2026-01-01"])).toEqual({});
  });

  it("strip le AND … > NOW() en queue (sessions non expirées)", () => {
    expect(parseWhere("token = ? AND expires_at > NOW()", ["t"])).toEqual({ token: "t" });
  });
});

describe("buildFilterQs", () => {
  it("génère des égalités eq. encodées", () => {
    expect(buildFilterQs({ token: "abc", user_id: "u1" })).toBe("token=eq.abc&user_id=eq.u1");
  });

  it("traduit null en is.null", () => {
    expect(buildFilterQs({ revoked_at: null })).toBe("revoked_at=is.null");
  });

  it("URL-encode les valeurs", () => {
    expect(buildFilterQs({ email: "a b@x.fr" })).toBe("email=eq.a%20b%40x.fr");
  });
});
