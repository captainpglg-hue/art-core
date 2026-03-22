import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, createSession, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, username, role } = await req.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const db = getDb();
    const existingUsername = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (existingUsername) {
      return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const userRole = role || "client";
    const isInitie = userRole === "initiate" ? 1 : 0;
    const initialPoints = isInitie ? 15 : 0;

    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, username, role, is_initie, points_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, email, passwordHash, name, username, userRole, isInitie, initialPoints);

    // Signup bonus for initiates
    if (isInitie) {
      const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      db.prepare(
        "INSERT INTO point_transactions (id, user_id, amount, type, description) VALUES (?, ?, 15, 'signup_bonus', 'Bonus de bienvenue initié')"
      ).run(ptId, userId);
    }

    const token = crypto.randomBytes(32).toString("hex");
    createSession(userId, token);

    const response = NextResponse.json({
      user: {
        id: userId,
        email,
        name,
        username,
        role: userRole,
        points_balance: initialPoints,
        is_initie: isInitie,
      },
    });

    response.cookies.set("core_session", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
