import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, query, queryOne } from "@/lib/db";
import { sendAdminCode } from "@/lib/mailer";

// ============================================================================
// /api/admin/auth/request-code
// ----------------------------------------------------------------------------
// Sécurité :
//   - Le code à 6 chiffres n'est JAMAIS renvoyé dans la réponse HTTP en
//     production (était une vulnérabilité critique : n'importe qui pouvait
//     récupérer un code admin valide en connaissant l'email).
//   - Escape hatch dev/preview : si ADMIN_DEV_CODE_ENABLED=1 ou si
//     VERCEL_ENV != "production", le code est renvoyé dans le JSON pour
//     faciliter les tests automatisés. Ne mets JAMAIS cette variable sur le
//     scope Production.
//   - Fallback : le code est toujours écrit dans les runtime logs Vercel
//     (console.warn) → tu peux le retrouver dans Vercel → Runtime Logs.
//   - Rate limit : si un code non-utilisé existe pour cet email et a été
//     créé il y a moins de 60 secondes, on renvoie 429 pour bloquer le
//     spam de génération.
// ============================================================================

const RATE_LIMIT_WINDOW_SECONDS = 60;

function shouldReturnDevCode(): boolean {
  if (process.env.ADMIN_DEV_CODE_ENABLED === "1") return true;
  // VERCEL_ENV = "production" | "preview" | "development" | undefined
  // undefined = dev local, preview = Preview deploys, production = Production
  const env = process.env.VERCEL_ENV;
  if (env && env !== "production") return true;
  if (!env && process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email et nom requis" },
        { status: 400 }
      );
    }

    // Vérifie que le compte existe et est admin
    const user = await getUserByEmail(email);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Cet email n'est pas associé à un compte administrateur" },
        { status: 401 }
      );
    }

    // ── Rate limit : un code non-utilisé récent bloque une nouvelle demande ─
    // NB : on passe la borne temporelle comme paramètre plutôt que d'injecter
    // la constante dans le SQL, même si la const est hardcodée ici. Deux
    // raisons : (1) robustesse si la constante devient dynamique un jour,
    // (2) postgres-js compare proprement les timestamps paramétrés.
    const cutoff = new Date(
      Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000
    ).toISOString();
    const recentCode = await queryOne<{ created_at: string }>(
      `SELECT created_at FROM admin_codes
       WHERE email = ? AND used = 0 AND created_at > ?
       ORDER BY created_at DESC LIMIT 1`,
      [email, cutoff]
    );

    if (recentCode) {
      return NextResponse.json(
        {
          error: `Un code a déjà été envoyé récemment. Patiente ${RATE_LIMIT_WINDOW_SECONDS} secondes avant de réessayer.`,
          retry_after_seconds: RATE_LIMIT_WINDOW_SECONDS,
        },
        { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS) } }
      );
    }

    // Génère un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Purge les codes expirés/non-utilisés pour cet email
    await query("DELETE FROM admin_codes WHERE email = ?", [email]);

    // Insère le nouveau code (expire après 10 minutes)
    const codeId = `adm_code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await query(
      `INSERT INTO admin_codes (id, email, code, name, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [codeId, email, code, name, expiresAt]
    );

    // Tentative d'envoi par email (SMTP ou équivalent)
    let emailResult: any = { success: false };
    try {
      emailResult = await sendAdminCode(email, name, code);
    } catch (mailError: any) {
      console.error("[admin/request-code] email send error:", mailError);
    }

    // Toujours écrit le code dans les runtime logs Vercel.
    // Ces logs ne sont accessibles qu'au propriétaire du projet Vercel.
    // N'utilise pas console.log car Vercel l'aggrège à un niveau "info" qui
    // peut être filtré ; console.warn reste visible avec Log level = warn.
    console.warn(
      `[admin/request-code] code généré pour ${email} : ${code} ` +
      `(expire à ${expiresAt}, email_sent=${emailResult?.success === true})`
    );

    // Construction de la réponse : dev_code UNIQUEMENT si escape hatch actif
    const exposeDevCode = shouldReturnDevCode();
    const payload: Record<string, any> = {
      success: true,
      message: emailResult?.success
        ? "Code envoyé à votre email"
        : "Code généré. Consulte les logs Vercel ou contacte l'administrateur.",
    };
    if (exposeDevCode) {
      payload.dev_code = code;
      payload.dev_email_url = emailResult?.localUrl || null;
      payload.dev_notice =
        "dev_code exposé car ADMIN_DEV_CODE_ENABLED=1 ou VERCEL_ENV != production. " +
        "Ne mets JAMAIS ADMIN_DEV_CODE_ENABLED sur le scope Production.";
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("[admin/request-code] error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
