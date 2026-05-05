// =============================================================================
// GET /auth/callback?code=XXX[&next=/path]
// Échange le code OAuth Supabase contre une session,
// résout / crée la ligne `users` correspondante,
// pose le cookie `core_session` (système de session custom de l'app),
// puis redirige vers /auth/complete-profile (nouveau user) ou `next`.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, createSession, getDb } from "@/lib/db";
import type { Database, TablesInsert } from "@/types/supabase";

const SAFE_NEXT_PREFIX = ["/art-core", "/auth"];

function safeNext(value: string | null): string {
  if (!value) return "/art-core";
  if (value.startsWith("//") || /^https?:/i.test(value)) return "/art-core";
  if (!SAFE_NEXT_PREFIX.some((p) => value === p || value.startsWith(p + "/") || value.startsWith(p + "?"))) {
    return "/art-core";
  }
  return value;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const baseHost = req.headers.get("host") || "art-core.app";
  const baseProtocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  const baseUrl = `${baseProtocol}://${baseHost}`;
  const next = safeNext(url.searchParams.get("next"));

  function redirectTo(pathname: string, error?: string): NextResponse {
    const u = new URL(pathname, baseUrl);
    if (error) u.searchParams.set("error", error);
    return NextResponse.redirect(u.toString(), { status: 302 });
  }

  if (errorParam) {
    return redirectTo("/auth/login", `oauth_${errorParam}`);
  }
  if (!code) {
    return redirectTo("/auth/login", "missing_code");
  }

  // ── 1. Exchange code ──────────────────────────────────────────────────────
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !supaKey) {
    console.error("[auth/callback] Supabase env missing");
    return redirectTo("/auth/login", "config_missing");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(supaUrl, supaKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
  });

  const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr || !exchangeData.user?.email) {
    console.error("[auth/callback] exchange failed:", exchangeErr?.message);
    return redirectTo("/auth/login", "oauth_exchange_failed");
  }

  const supaUser = exchangeData.user;
  const email = supaUser.email!.toLowerCase();
  const meta = (supaUser.user_metadata || {}) as Record<string, unknown>;
  const fullNameFromGoogle =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email.split("@")[0];
  const avatarFromGoogle =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  // ── 2. Find or create user in our `users` table ───────────────────────────
  let userId: string;
  let isNewUser = false;
  const existing = await getUserByEmail(email);
  if (existing) {
    userId = (existing as { id: string }).id;
  } else {
    isNewUser = true;
    const newId = crypto.randomUUID();
    // Placeholder password_hash : la colonne accepte null mais on garde la
    // convention magic-link/verify pour cohérence.
    const placeholder = crypto.randomBytes(24).toString("base64");
    const passwordHash = await bcrypt.hash(placeholder, 10);
    // username placeholder unique — sera remplacé sur /auth/complete-profile
    const placeholderUsername = `g_${newId.slice(0, 8)}`;

    const insert: TablesInsert<"users"> = {
      id: newId,
      email,
      username: placeholderUsername,
      full_name: fullNameFromGoogle,
      avatar_url: avatarFromGoogle,
      password_hash: passwordHash,
      role: "artist",
      is_initie: false,
      points_balance: 0,
      profile_complete: false,
    };
    const { error: insErr } = await getDb().from("users").insert(insert);
    if (insErr) {
      console.error("[auth/callback] users insert failed:", insErr.message);
      return redirectTo("/auth/login", "user_creation_failed");
    }
    userId = newId;
  }

  // ── 3. Mint our own session token + cookie (independent of Supabase) ──────
  const sessionToken = crypto.randomBytes(32).toString("hex");
  await createSession(userId, sessionToken);

  // ── 4. Clean up Supabase session cookies (we use core_session only) ───────
  await supabase.auth.signOut();

  // ── 5. Redirect ───────────────────────────────────────────────────────────
  const dest = isNewUser
    ? `/auth/complete-profile?next=${encodeURIComponent(next)}`
    : next;
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
