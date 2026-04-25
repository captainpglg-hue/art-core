import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, createSession, queryOne } from "@/lib/db";

// art-core/auth/signup ne crée plus que des comptes ACHETEURS (client/initiate).
// Tout déposant (artist + 4 statuts pros) doit passer par pass-core.app/auth/signup.
const BUYER_ROLES = new Set(["client", "initiate"]);
const SELLER_REDIRECT = "https://pass-core.app/auth/signup";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, username, role } = await req.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const userRole = role || "client";
    if (!BUYER_ROLES.has(userRole)) {
      return NextResponse.json(
        {
          error: "Les comptes vendeurs / déposants se créent sur Pass-Core.",
          redirect_to: SELLER_REDIRECT,
        },
        { status: 400 }
      );
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
    const isInitie = userRole === "initiate";
    const initialPoints = isInitie ? 15 : 0;

    const sbAdmin = (await import("@/lib/db")).getDb();
    const { error: insErr } = await sbAdmin.from("users").insert({
      id: userId,
      email,
      password_hash: passwordHash,
      full_name: name,
      username,
      role: userRole,
      is_initie: isInitie,
      points_balance: initialPoints,
    });
    if (insErr) {
      console.error("[signup] INSERT users failed:", insErr.message);
      return NextResponse.json({ error: "Erreur création compte : " + insErr.message }, { status: 500 });
    }

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
