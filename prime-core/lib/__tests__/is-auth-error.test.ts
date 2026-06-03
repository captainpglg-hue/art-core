import { describe, it, expect } from "vitest";
import { isAuthError } from "../db";

// Régression : un DATABASE_URL corrompu (caractère non-Latin1 dans le mot de
// passe) fait planter postgres-js avec une TypeError "ByteString" lors du SCRAM.
// Ce crash doit être reconnu comme une panne pg pour basculer sur le fallback
// REST — sinon /api/markets renvoie [] en boucle (échecs smoke-tests CI).
describe("isAuthError", () => {
  it("classe l'erreur ByteString (DATABASE_URL corrompu) comme panne pg", () => {
    const e = new TypeError(
      "Cannot convert argument to a ByteString because the character at index 48 has a value of 65533 which is greater than 255."
    );
    expect(isAuthError(e)).toBe(true);
  });

  it("classe les vraies erreurs d'auth/connexion", () => {
    expect(isAuthError(new Error("password authentication failed"))).toBe(true);
    expect(isAuthError(new Error("getaddrinfo ENOTFOUND db.host"))).toBe(true);
    expect(isAuthError(new Error("connect ECONNREFUSED"))).toBe(true);
    expect(isAuthError({ code: "28P01" })).toBe(true);
  });

  it("ne classe PAS une erreur SQL applicative ordinaire", () => {
    expect(isAuthError(new Error('relation "foo" does not exist'))).toBe(false);
    expect(isAuthError(new Error("syntax error at or near \"SELCT\""))).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
  });
});
