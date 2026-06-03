import { describe, it, expect } from "vitest";
import {
  isAllowedNext,
  encodeState,
  decodeState,
  buildAuthorizeUrl,
  SSO_CLIENT,
} from "../sso-client";

describe("isAllowedNext", () => {
  it("accepte un chemin interne absolu", () => {
    expect(isAllowedNext("/prime-core/dashboard")).toBe(true);
    expect(isAllowedNext("/")).toBe(true);
  });
  it("rejette les URLs absolues / protocole-relatives (anti open-redirect)", () => {
    expect(isAllowedNext("//evil.com")).toBe(false);
    expect(isAllowedNext("https://evil.com")).toBe(false);
    expect(isAllowedNext("/\\evil.com")).toBe(false);
    expect(isAllowedNext("relatif")).toBe(false);
  });
});

describe("encodeState / decodeState", () => {
  it("roundtrip conserve nonce et next", () => {
    const s = encodeState({ n: "abc123", next: "/prime-core/scout" });
    expect(decodeState(s)).toEqual({ n: "abc123", next: "/prime-core/scout" });
  });
  it("neutralise un next dangereux au décodage", () => {
    // state forgé avec un next absolu → ramené à "/"
    const forged = Buffer.from(
      JSON.stringify({ n: "x", next: "https://evil.com" }),
      "utf8"
    ).toString("base64url");
    expect(decodeState(forged)).toEqual({ n: "x", next: "/" });
  });
  it("retourne null sur state corrompu", () => {
    expect(decodeState("pas-du-base64-json!!")).toBeNull();
    expect(decodeState(Buffer.from('{"n":1}', "utf8").toString("base64url"))).toBeNull();
  });
});

describe("buildAuthorizeUrl", () => {
  it("cible l'IdP avec client + redirect_uri + state", () => {
    const u = new URL(buildAuthorizeUrl("https://prime-core.app", "STATE123"));
    expect(u.pathname).toBe("/auth/sso/authorize");
    expect(u.searchParams.get("client")).toBe(SSO_CLIENT);
    expect(u.searchParams.get("redirect_uri")).toBe("https://prime-core.app/auth/sso/callback");
    expect(u.searchParams.get("state")).toBe("STATE123");
  });
});
