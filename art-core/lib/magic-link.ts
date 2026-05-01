// =============================================================================
// lib/magic-link.ts — Authentification par magic link (pas de mot de passe)
// =============================================================================
// Flux :
//   1) /api/auth/magic-link/request : on recoit { email, intent, signup_data? }.
//      On genere un token aleatoire (32 bytes hex), on stocke son hash SHA-256
//      dans magic_links avec expires_at = +15 min, on envoie un email
//      contenant le lien https://.../api/auth/magic-link/verify?token=XXX
//   2) /api/auth/magic-link/verify?token=XXX : on hash le token recu, on
//      cherche la ligne, on verifie expires_at + used_at, on cree le user
//      si signup_data, on cree la session, on pose le cookie, on redirige.
//
// Securite :
//   - Token brut JAMAIS stocke en DB. Hash SHA-256 only.
//   - Single-use : used_at marque apres premiere consommation.
//   - 15 min TTL.
// =============================================================================

import crypto from "crypto";
import { getDb } from "@/lib/db";
import type { Json } from "@/types/supabase";

const TOKEN_TTL_MINUTES = 15;

export type MagicLinkIntent = "login" | "signup";

export interface MagicLinkSignupData {
  first_name: string;
  last_name: string;
  pseudo: string;
  phone?: string;
  email: string;
}

export interface CreateMagicLinkArgs {
  email: string;
  intent: MagicLinkIntent;
  signupData?: MagicLinkSignupData;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerifiedMagicLink {
  id: string;
  email: string;
  intent: MagicLinkIntent;
  signupData: MagicLinkSignupData | null;
}

function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createMagicLink(args: CreateMagicLinkArgs): Promise<string> {
  const sb = getDb();
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  const { error } = await sb.from("magic_links").insert({
    token_hash: hash,
    email: args.email.trim().toLowerCase(),
    intent: args.intent,
    signup_data: (args.signupData ?? null) as Json | null,
    expires_at: expiresAt.toISOString(),
    ip_address: args.ipAddress || null,
    user_agent: args.userAgent || null,
  });
  if (error) throw new Error("magic_link insert failed: " + error.message);

  return raw;
}

export async function verifyAndConsumeMagicLink(rawToken: string): Promise<VerifiedMagicLink | null> {
  if (!rawToken || typeof rawToken !== "string") return null;
  const sb = getDb();
  const hash = hashToken(rawToken);

  const { data: row, error } = await sb
    .from("magic_links")
    .select("id, email, intent, signup_data, expires_at, used_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) {
    console.error("[magic-link] select failed:", error.message);
    return null;
  }
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at) <= new Date()) return null;

  const { error: updErr } = await sb
    .from("magic_links")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);
  if (updErr) console.warn("[magic-link] mark-used failed:", updErr.message);

  return {
    id: row.id,
    email: row.email,
    intent: row.intent as MagicLinkIntent,
    signupData: (row.signup_data as MagicLinkSignupData | null) || null,
  };
}

export function buildVerifyUrl(token: string, host?: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL
    || (host ? "https://" + host : "https://art-core.app");
  return base.replace(/\/$/, "") + "/api/auth/magic-link/verify?token=" + encodeURIComponent(token);
}

export async function isRateLimited(email: string): Promise<boolean> {
  const sb = getDb();
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count, error } = await sb
    .from("magic_links")
    .select("id", { count: "exact", head: true })
    .eq("email", email.trim().toLowerCase())
    .gte("created_at", since);
  if (error) {
    console.warn("[magic-link] rate-limit check failed:", error.message);
    return false;
  }
  const c = typeof count === "number" ? count : 0;
  return c >= 3;
}
