// =============================================================================
// GET /api/auth/magic-link/verify?token=XXX
// Valide le token, crée le user si signup, pose le cookie de session,
// redirige vers /art-core (ou /art-core/deposer si intent=signup).
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { verifyAndConsumeMagicLink } from "@/lib/magic-link";
import { getDb, getUserByEmail, createSession, queryOne } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const baseHost = req.headers.get("host") || "art-core.app";
  const baseProtocol = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${baseProtocol}://${baseHost}`;

  function redirectTo(pathname: string, error?: string) {
    const u = new URL(pathname, baseUrl);
    if (error) u.searchParams.set("error", error);
    return NextResponse.redirect(u.toString(), { status: 302 });
  }

  if (!token) return redirectTo("/auth/login", "missing_token");

  const verified = await verifyAndConsumeMagicLink(token);
  if (!verified) return redirectTo("/auth/login", "invalid_or_expired");

  const sb = getDb();
  let userId: string | null = null;

  // 1) Récupérer ou créer le user
  if (verified.intent === "signup" && verified.signupData) {
    // Re-check email pas déjà pris (race possible entre request et verify)
    const existing = await getUserByEmail(verified.email);
    if (existing) {
      userId = (existing as any).id;
    } else {
      const { first_name, last_name, pseudo, phone } = verified.signupData;
      // Pseudo pas pris ?
      const pseudoTaken = await queryOne("SELECT id FROM users WHERE username = ?", [pseudo]);
      if (pseudoTaken) return redirectTo("/auth/signup", "pseudo_taken");

      const newId = crypto.randomUUID();
      // Mot de passe placeholder (jamais utilisé pour login car on est en
      // magic-link only). On le stocke quand même hashé pour respecter la
      // contrainte NOT NULL si elle existe.
      const placeholder = crypto.randomBytes(24).toString("base64");
      const passwordHash = await bcrypt.hash(placeholder, 10);

      const fullName = `${first_name} ${last_name}`.trim();

      const { error: insErr } = await sb.from("users").insert({
        id: newId,
        email: verified.email,
        password_hash: passwordHash,
        full_name: fullName,
        first_name,
        last_name,
        username: pseudo,
        phone: phone || null,
        role: "artist",  // valeur par défaut. Sera corrigée au formulaire seller-profile.
        is_initie: false,
        points_balance: 0,
      });
      if (insErr) {
        console.error("[magic-link/verify] user insert failed:", insErr.message);
        return redirectTo("/auth/signup", "user_creation_failed");
      }
      userId = newId;
    }
  } else {
    // intent=login : récupérer le user
    const u = await getUserByEmail(verified.email);
    if (!u) return redirectTo("/auth/login", "no_account");
    userId = (u as any).id;
  }

  if (!userId) return redirectTo("/auth/login", "user_resolution_failed");

  // 2) Créer la session
  const sessionToken = crypto.randomBytes(32).toString("hex");
  await createSession(userId, sessionToken);

  // 3) Redirection contextuelle
  const dest = verified.intent === "signup" ? "/art-core/deposer" : "/art-core";
  const response = NextResponse.redirect(new URL(dest, baseUrl).toString(), { status: 302 });
  response.cookies.set("core_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  return response;
}
