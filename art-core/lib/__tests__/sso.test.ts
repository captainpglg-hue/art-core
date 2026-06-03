import { describe, it, expect } from "vitest";
import {
  isAllowedRedirect,
  isCodeExpired,
  secretMatches,
  generateSsoCode,
  SSO_CLIENTS,
} from "../sso";

describe("isAllowedRedirect", () => {
  it("accepte les redirect_uri en allowlist", () => {
    expect(isAllowedRedirect("prime-core", "https://prime-core.app/auth/sso/callback")).toBe(true);
    expect(isAllowedRedirect("prime-core", "https://www.prime-core.app/auth/sso/callback")).toBe(true);
    expect(isAllowedRedirect("pass-core", "https://pass-core.app/auth/sso/callback")).toBe(true);
  });

  it("rejette un client inconnu", () => {
    expect(isAllowedRedirect("evil-core", "https://prime-core.app/auth/sso/callback")).toBe(false);
  });

  it("rejette un redirect_uri hors allowlist (anti open-redirect)", () => {
    expect(isAllowedRedirect("prime-core", "https://evil.example/auth/sso/callback")).toBe(false);
    expect(isAllowedRedirect("prime-core", "https://prime-core.app.evil.com/auth/sso/callback")).toBe(false);
    expect(isAllowedRedirect("prime-core", "https://prime-core.app/auth/sso/callback?x=1")).toBe(false);
  });
});

describe("isCodeExpired", () => {
  const now = new Date("2026-06-03T10:00:00Z");
  it("non expiré si expires_at dans le futur", () => {
    expect(isCodeExpired("2026-06-03T10:00:30Z", now)).toBe(false);
  });
  it("expiré si expires_at passé ou égal", () => {
    expect(isCodeExpired("2026-06-03T09:59:59Z", now)).toBe(true);
    expect(isCodeExpired("2026-06-03T10:00:00Z", now)).toBe(true);
  });
  it("expiré si date invalide", () => {
    expect(isCodeExpired("pas-une-date", now)).toBe(true);
  });
});

describe("secretMatches", () => {
  it("vrai si identiques", () => {
    expect(secretMatches("s3cr3t-partage", "s3cr3t-partage")).toBe(true);
  });
  it("faux si différents ou vides", () => {
    expect(secretMatches("a", "b")).toBe(false);
    expect(secretMatches("court", "beaucoup-plus-long")).toBe(false);
    expect(secretMatches("", "x")).toBe(false);
    expect(secretMatches(undefined, "x")).toBe(false);
    expect(secretMatches("x", null)).toBe(false);
  });
});

describe("generateSsoCode", () => {
  it("génère 64 hex (32 octets) et varie", () => {
    const a = generateSsoCode();
    const b = generateSsoCode();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("SSO_CLIENTS", () => {
  it("ne contient que les parties attendues", () => {
    expect(Object.keys(SSO_CLIENTS).sort()).toEqual(["pass-core", "prime-core"]);
  });
});
