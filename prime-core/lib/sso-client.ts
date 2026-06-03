// ============================================================================
// lib/sso-client.ts — prime-core en « partie » (relying party) du SSO
// ----------------------------------------------------------------------------
// art-core est le fournisseur d'identité (IdP). prime-core ne gère pas le login :
// il redirige vers l'IdP (/auth/sso/start → IdP /auth/sso/authorize), reçoit un
// code sur /auth/sso/callback, l'échange serveur→serveur contre le token de
// session, puis pose son propre cookie core_session (host-only).
//
// Ce module ne contient que des helpers PURS (URL + state) testés unitairement.
// Le secret partagé n'est lu que côté route serveur (callback), jamais ici.
// ============================================================================

/** Base URL de l'IdP (art-core). Surcharge possible en dev via env. */
export const IDP_BASE = process.env.NEXT_PUBLIC_ART_CORE_URL || "https://art-core.app";

/** Nom de cette partie tel que déclaré dans l'allowlist de l'IdP. */
export const SSO_CLIENT = "prime-core";

/** Nom du cookie de session partagé (identique sur les 3 domaines). */
export const SESSION_COOKIE = "core_session";

/** Cookie éphémère portant le nonce anti-CSRF pendant le round-trip SSO. */
export const STATE_COOKIE = "sso_state";

export interface SsoState {
  n: string; // nonce anti-CSRF (comparé au cookie STATE_COOKIE)
  next: string; // chemin interne où revenir après login
}

/**
 * `next` doit être un chemin interne absolu ("/...") et non protocole-relatif
 * ("//evil") ni une URL absolue — sinon open-redirect après login.
 */
export function isAllowedNext(next: string): boolean {
  return (
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\")
  );
}

export function encodeState(state: SsoState): string {
  const safeNext = isAllowedNext(state.next) ? state.next : "/";
  const json = JSON.stringify({ n: state.n, next: safeNext });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeState(raw: string): SsoState | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const obj = JSON.parse(json) as Partial<SsoState>;
    if (typeof obj.n !== "string" || typeof obj.next !== "string") return null;
    return { n: obj.n, next: isAllowedNext(obj.next) ? obj.next : "/" };
  } catch {
    return null;
  }
}

/** Construit l'URL d'autorisation IdP pour cette partie. */
export function buildAuthorizeUrl(selfOrigin: string, state: string): string {
  const redirectUri = `${selfOrigin}/auth/sso/callback`;
  const u = new URL("/auth/sso/authorize", IDP_BASE);
  u.searchParams.set("client", SSO_CLIENT);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}
