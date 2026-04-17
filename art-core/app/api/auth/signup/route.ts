import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, createSession, query, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, username, role } = await req.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const existingUsername = await queryOne(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (existingUsername) {
      return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const userRole = role || "client";
    const isInitie = userRole === "initiate";
    const initialPoints = isInitie ? 15 : 0;

    // Schéma déployé : colonne `name` (pas `full_name`). is_initie est INTEGER
    // côté DB → on coerce le boolean en 0/1 pour éviter toute ambiguïté de
    // type avec postgres-js.
    await query(
      "INSERT INTO users (id, email, password_hash, name, username, role, is_initie, points_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, email, passwordHash, name, username, userRole, isInitie ? 1 : 0, initialPoints]
    );

    const token = crypto.randomBytes(32).toString("hex");
    await createSession(userId, token);

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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[signup] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
