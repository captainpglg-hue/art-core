// =============================================================================
// POST /api/auth/magic-link/request
// Body : { email, intent: "login" | "signup", signup_data? }
// Réponse : { sent: boolean, message: string }
//
// Crée un magic link, l'envoie par email. Pour l'inscription, on attache
// signup_data (first_name, last_name, pseudo, phone) qui sera utilisé
// au moment du verify pour créer le compte.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { sendMagicLinkEmail } from "@/lib/mailer";
import {
  createMagicLink,
  buildVerifyUrl,
  isRateLimited,
  type MagicLinkSignupData,
} from "@/lib/magic-link";
import { getUserByEmail, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });

    const email: string = (body.email || "").trim().toLowerCase();
    const intent: "login" | "signup" = body.intent === "signup" ? "signup" : "login";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Rate limit par email
    if (await isRateLimited(email)) {
      return NextResponse.json({
        error: "Trop de tentatives. Réessaye dans quelques minutes.",
        code: "RATE_LIMITED",
      }, { status: 429 });
    }

    // Validation contextuelle login vs signup
    const existingUser = await getUserByEmail(email);

    if (intent === "login") {
      if (!existingUser) {
        // Pour ne pas leaker l'existence d'un compte, on renvoie un succès
        // factice. Côté UX : la personne reçoit aucun email mais la page
        // affiche "vérifie ta boîte". Acceptable parce que de toute façon
        // un email non inscrit ne pourra pas valider.
        return NextResponse.json({
          sent: true,
          message: "Si un compte existe pour cette adresse, un lien de connexion a été envoyé.",
        });
      }
    }

    let signupData: MagicLinkSignupData | undefined;
    if (intent === "signup") {
      if (existingUser) {
        return NextResponse.json({
          error: "Cet email est déjà inscrit. Utilise plutôt 'Me connecter'.",
          code: "ALREADY_REGISTERED",
        }, { status: 409 });
      }
      const { first_name, last_name, pseudo, phone } = body.signup_data || {};
      const missing: string[] = [];
      if (!String(first_name || "").trim()) missing.push("Prénom");
      if (!String(last_name || "").trim()) missing.push("Nom");
      if (!String(pseudo || "").trim()) missing.push("Pseudo");
      if (missing.length > 0) {
        return NextResponse.json({
          error: `Champs manquants : ${missing.join(", ")}`,
          missing,
        }, { status: 400 });
      }
      const cleanPseudo = String(pseudo).toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (cleanPseudo.length < 3) {
        return NextResponse.json({
          error: "Le pseudo doit faire au moins 3 caractères (lettres, chiffres, _).",
        }, { status: 400 });
      }
      const existingPseudo = await queryOne(
        "SELECT id FROM users WHERE username = ?",
        [cleanPseudo],
      );
      if (existingPseudo) {
        return NextResponse.json({
          error: "Ce pseudo est déjà pris. Choisis-en un autre.",
          code: "PSEUDO_TAKEN",
        }, { status: 409 });
      }
      signupData = {
        first_name: String(first_name).trim(),
        last_name: String(last_name).trim(),
        pseudo: cleanPseudo,
        phone: phone ? String(phone).trim() : undefined,
        email,
      };
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    const rawToken = await createMagicLink({
      email,
      intent,
      signupData,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });

    const verifyUrl = buildVerifyUrl(rawToken, req.headers.get("host") || undefined);

    const recipientName = signupData
      ? `${signupData.first_name} ${signupData.last_name}`.trim()
      : (existingUser as any)?.full_name || (existingUser as any)?.first_name || "";

    const emailResult = await sendMagicLinkEmail({
      to: email,
      recipientName,
      verifyUrl,
      intent,
    });

    if (!emailResult.success) {
      console.error("[magic-link/request] email failed:", emailResult.error);
      return NextResponse.json({
        error: "Impossible d'envoyer l'email de connexion. Réessaye plus tard.",
        debug: emailResult.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      sent: true,
      message: "Lien de connexion envoyé. Vérifie ta boîte mail (et les spams).",
    });
  } catch (e: any) {
    console.error("[magic-link/request] error:", e?.message);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
