import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  getUserByEmail,
  getUserByUsername,
  createUser,
  createSession,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "prime_session";

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isValidUsername(s: string) {
  return /^[a-z0-9_-]{3,24}$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Username invalide (3-24 caractères, [a-z0-9_-])" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Mot de passe trop court (min 8 caractères)" },
        { status: 400 },
      );
    }

    const existingByEmail = await getUserByEmail(email);
    if (existingByEmail) {
      return NextResponse.json(
        { error: "Email déjà utilisé — utilise la page de connexion." },
        { status: 409 },
      );
    }
    const existingByUsername = await getUserByUsername(username);
    if (existingByUsername) {
      return NextResponse.json(
        { error: "Username déjà pris" },
        { status: 409 },
      );
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, username, password_hash });
    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Création du compte impossible — réessaie." },
        { status: 500 },
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const session = await createSession(user.id, token);
    if (!session) {
      return NextResponse.json(
        { error: "Création de session impossible — réessaie." },
        { status: 500 },
      );
    }

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        points_balance: user.points_balance ?? 0,
      },
    });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erreur serveur" },
      { status: 500 },
    );
  }
}
