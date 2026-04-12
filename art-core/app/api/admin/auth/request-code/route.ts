import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, getDb } from "@/lib/db";
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

    // Check if user exists and is an admin
    const user = getUserByEmail(email);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Cet email n'est pas associé à un compte administrateur" },
        { status: 401 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const db = getDb();

    // Create admin_codes table if not exists
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

    // Delete old codes for this email
    db.prepare("DELETE FROM admin_codes WHERE email = ?").run(email);

    // Insert new code with 10-minute expiry
    const codeId = `adm_code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(
      `INSERT INTO admin_codes (id, email, code, name, expires_at)
       VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'))`
    ).run(codeId, email, code, name);

    // Send email + save locally
    let emailResult: any = { success: false };
    try {
      emailResult = await sendAdminCode(email, name, code);
    } catch (mailError: any) {
      console.error("Email send error:", mailError);
    }

    // In development mode, return the code directly + email preview URL
    // This ensures the flow works even without SMTP configuration
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
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
