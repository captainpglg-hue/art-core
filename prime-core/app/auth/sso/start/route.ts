// Destination : prime-core/app/auth/sso/start/route.ts
// Point d'entrée du login pour prime-core : génère un nonce anti-CSRF (posé en
// cookie httpOnly court), construit l'URL d'autorisation IdP et redirige.
// Usage : <a href="/auth/sso/start?next=/prime-core/dashboard">Se connecter</a>
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  buildAuthorizeUrl,
  encodeState,
  isAllowedNext,
  STATE_COOKIE,
} from "@/lib/sso-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = isAllowedNext(rawNext) ? rawNext : "/";

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = encodeState({ n: nonce, next });

  const dest = buildAuthorizeUrl(url.origin, state);
  const res = NextResponse.redirect(dest);

  // Nonce conservé côté partie pour valider le retour (anti-CSRF). TTL court.
  res.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 5 * 60,
    path: "/",
  });
  return res;
}
