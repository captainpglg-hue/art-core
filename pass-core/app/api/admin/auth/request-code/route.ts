import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendAdminCode } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email et nom requis" },
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

    // Check if email exists and is admin
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Email non trouvé ou permissions insuffisantes" },
        { status: 403 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = `adm_code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Delete old codes for this email
    db.prepare("DELETE FROM admin_codes WHERE email = ? AND used = 0").run(email);

    // Insert new code
    db.prepare(
      `INSERT INTO admin_codes (id, email, code, name, expires_at, used) VALUES (?, ?, ?, ?, ?, 0)`
    ).run(codeId, email, code, name, expiresAt);

    // Send email + save locally
    let emailResult: any = { success: false };
    try {
      emailResult = await sendAdminCode(email, name, code);
    } catch (mailError: any) {
      console.error("Email send error:", mailError);
    }

    // In development mode, return the code directly
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      success: true,
      message: "Code envoyé à votre email",
      ...(isDev ? {
        dev_code: code,
        dev_email_url: emailResult?.localUrl || null,
        dev_notice: "Mode développement : le code est affiché directement. En production, il sera envoyé uniquement par email."
      } : {}),
    });
  } catch (error: any) {
    console.error("Request code error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
