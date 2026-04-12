import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getUserByEmail, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email et code requis" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Look up code in admin_codes
    const codeRecord = db.prepare(
      `SELECT * FROM admin_codes
       WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')`
    ).get(email, code) as any;

    if (!codeRecord) {
      return NextResponse.json(
        { error: "Code invalide ou expiré" },
        { status: 401 }
      );
    }

    // Mark code as used
    db.prepare("UPDATE admin_codes SET used = 1 WHERE id = ?").run(codeRecord.id);

    // Get user
    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Create admin session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionId = `adm_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Create sessions table entry with admin marker
    db.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at)
       VALUES (?, ?, ?, datetime('now', '+24 hours'))`
    ).run(sessionId, user.id, sessionToken);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set admin_session cookie (httpOnly, 24h expiry)
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
