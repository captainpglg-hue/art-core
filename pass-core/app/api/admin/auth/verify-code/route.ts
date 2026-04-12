import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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

    // Ensure admin_codes table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Ensure sessions table exists (if it doesn't)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Look up code
    const codeRecord = db
      .prepare(
        `SELECT * FROM admin_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')`
      )
      .get(email, code) as any;

    if (!codeRecord) {
      return NextResponse.json(
        { error: "Code invalide ou expiré" },
        { status: 401 }
      );
    }

    // Mark code as used
    db.prepare("UPDATE admin_codes SET used = 1 WHERE id = ?").run(codeRecord.id);

    // Get user
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Utilisateur non trouvé ou permissions insuffisantes" },
        { status: 403 }
      );
    }

    // Create session
    const sessionId = `adm_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sessionToken = `adm_token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    db.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
    ).run(sessionId, user.id, sessionToken, expiresAt);

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set admin_session cookie
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Verify code error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
