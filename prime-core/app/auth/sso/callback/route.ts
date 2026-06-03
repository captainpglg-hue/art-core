// Destination : prime-core/app/auth/sso/callback/route.ts
// Retour du handoff SSO : valide le state (nonce vs cookie), échange le code
// contre le token de session via l'IdP (serveur→serveur, secret partagé), puis
// pose le cookie core_session (host-only) et redirige vers la cible interne.
import { NextRequest, NextResponse } from "next/server";
import {
  IDP_BASE,
  SSO_CLIENT,
  SESSION_COOKIE,
  STATE_COOKIE,
  decodeState,
} from "@/lib/sso-client";

export const dynamic = "force-dynamic";

function fail(origin: string, reason: string) {
  // En cas d'échec on renvoie vers l'accueil avec un marqueur d'erreur discret.
  const u = new URL("/", origin);
  u.searchParams.set("sso_error", reason);
  return NextResponse.redirect(u);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const rawState = url.searchParams.get("state") ?? "";

  if (!code) return fail(url.origin, "missing_code");

  // Validation anti-CSRF : le nonce du state doit matcher le cookie posé au start.
  const state = decodeState(rawState);
  const nonceCookie = req.cookies.get(STATE_COOKIE)?.value;
  if (!state || !nonceCookie || state.n !== nonceCookie) {
    return fail(url.origin, "bad_state");
  }

  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) return fail(url.origin, "server_misconfig");

  // Échange serveur→serveur du code contre { user_id, token }.
  let token: string | undefined;
  try {
    const r = await fetch(`${IDP_BASE}/api/auth/sso/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ code, client: SSO_CLIENT, secret }),
    });
    if (!r.ok) return fail(url.origin, "exchange_failed");
    const data = (await r.json()) as { token?: string };
    token = data.token;
  } catch {
    return fail(url.origin, "exchange_error");
  }

  if (!token) return fail(url.origin, "no_token");

  // Session établie côté prime-core : même token partagé, cookie host-only.
  const dest = new URL(state.next, url.origin);
  const res = NextResponse.redirect(dest);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  // Nonce consommé.
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
