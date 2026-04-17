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
    // la constante dans le SQL, mê