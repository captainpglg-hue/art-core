import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, createSession } from "@/lib/db";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "prime_session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 },
      );
    }

    const user = await getUserByEmail(email);
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
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
