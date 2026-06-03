// ============================================================================
// lib/sso.ts — art-core en fournisseur d'identité (IdP) pour le SSO inter-domaines
// ----------------------------------------------------------------------------
// art-core.app / pass-core.app / prime-core.app étant 3 domaines racines
// distincts, un cookie ne peut pas être partagé. Le SSO passe par un handoff
// redirection + code à usage unique (cf. migration 20260603000000_sso_codes).
//
// Modèle de session retenu : MÊME token partagé. Le code encapsule le token de
// session art-core existant ; la partie le réutilise tel quel pour poser son
// propre cookie core_session host-only. Une seule ligne `sessions` back les 3
// domaines → logout global = suppression de cette ligne.
//
// Les fonctions de validation (isAllowedRedirect / isCodeExpired /
// secretMatches) sont PURES et testées unitairement. Les fonctions DB
// (createSsoCode / consumeSsoCode) réutilisent les helpers query/queryOne.
// ============================================================================

import crypto from "crypto";
import { query, queryOne } from "./db";

/**
 * Allowlist stricte des parties SSO et de leurs redirect_uri autorisés.
 * Un redirect_uri hors liste = rejet (anti open-redirect / fuite de token).
 * On inclut les variantes prod (apex + www) et localhost pour le dev.
 */
export const SSO_CLIENTS: Record<string, string[]> = {
  "prime-core": [
    "https://prime-core.app/auth/sso/callback",
    "https://www.prime-core.app/auth/sso/callback",
    "http://localhost:3002/auth/sso/callback",
  ],
  "pass-core": [
    "https://pass-core.app/auth/sso/callback",
    "http://localhost:3001/auth/sso/callback",
  ],
};

export function isAllowedRedirect(client: string, redirectUri: string): boolean {
  const allow = SSO_CLIENTS[client];
  return !!allow && allow.includes(redirectUri);
}

/** Durée de vie d'un code SSO : court par construction (handoff immédiat). */
export const CODE_TTL_MS = 60_000;

export function isCodeExpired(expiresAt: string, now: Date = new Date()): boolean {
  const t = Date.parse(expiresAt);
  return Number.isNaN(t) || t <= now.getTime();
}

/**
 * Comparaison à temps constant du secret partagé serveur-à-serveur.
 * Évite une attaque temporelle sur l'endpoint /api/auth/sso/token.
 */
export function secretMatches(
  provided: string | undefined | null,
  expected: string | undefined | null
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateSsoCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Crée un code à usage unique lié au token de session art-core courant. */
export async function createSsoCode(params: {
  userId: string;
  token: string;
  client: string;
  redirectUri: string;
}): Promise<string> {
  const code = generateSsoCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  await query(
    "INSERT INTO sso_codes (code, user_id, token, client, redirect_uri, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [code, params.userId, params.token, params.client, params.redirectUri, expiresAt]
  );
  return code;
}

/**
 * Échange un code contre { user_id, token } et l'invalide (single-use).
 * Retourne null si : inexistant, mauvais client, déjà utilisé, ou expiré.
 */
export async function consumeSsoCode(
  code: string,
  client: string
): Promise<{ user_id: string; token: string } | null> {
  const row = await queryOne<{
    user_id: string;
    token: string;
    client: string;
    used_at: string | null;
    expires_at: string;
  }>("SELECT user_id, token, client, used_at, expires_at FROM sso_codes WHERE code = ? LIMIT 1", [code]);

  if (!row) return null;
  if (row.client !== client) return null;
  if (row.used_at) return null;
  if (isCodeExpired(row.expires_at)) return null;

  // Marque utilisé seulement si pas déjà consommé (garde-fou anti-rejeu).
  await query("UPDATE sso_codes SET used_at = ? WHERE code = ? AND used_at IS NULL", [
    new Date().toISOString(),
    code,
  ]);

  return { user_id: row.user_id, token: row.token };
}
