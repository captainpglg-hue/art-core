import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, query } from "@/lib/db";
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
    const user = await getUserByEmail(email);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Cet email n'est pas associé à un compte administrateur" },
        { status: 401 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // TODO: Create admin_codes table should be in migration/initialization
    // For now, assume it exists

    // Delete old codes for this email
    await query("DELETE FROM admin_codes WHERE email = ?", [email]);

    // Insert new code with 10-minute expiry
    const codeId = `adm_code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await query(
      `INSERT INTO admin_codes (id, email, code, name, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [codeId, email, code, name, expiresAt]
    );

    // Send email + save locally
    let emailResult: any = { success: false };
    try {
      emailResult = await sendAdminCode(email, name, code);
    } catch (mailError: any) {
      console.error("Email send error:", mailError);
    }

    // BETA MODE: Always return the code for testing
    // TODO: Remove dev_code in final production release when SMTP is configured
    const isBeta = !process.env.SMTP_HOST || !process.env.SMTP_PASS;
    return NextResponse.json({
      success: true,
      message: isBeta ? "Code généré (mode beta)" : "Code envoyé à votre email",
      ...(isBeta ? {
        dev_code: code,
        dev_email_url: emailResult?.localUrl || null,
        dev_notice: "Mode beta : le code est retourné directement. Configurez SMTP pour l'envoi par email."
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
