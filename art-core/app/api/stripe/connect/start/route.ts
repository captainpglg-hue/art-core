// ============================================================================
// POST /api/stripe/connect/start
// ----------------------------------------------------------------------------
// Crée (ou réutilise) un compte Stripe Connect Express pour l'utilisateur connecté,
// puis génère un AccountLink d'onboarding (return + refresh URLs).
//
// Réponse : { url, account_id }
//   - url        : lien d'onboarding hosted par Stripe — le client doit y aller
//   - account_id : l'id `acct_…` enregistré sur users.stripe_account_id
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";
import {
  stripe,
  isStripeConfigured,
  createConnectAccount,
  createOnboardingLink,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function baseUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "art-core.app";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe non configuré (STRIPE_SECRET_KEY manquant)." },
        { status: 503 }
      );
    }

    const sb = getDb();
    let accountId = (user as { stripe_account_id: string | null }).stripe_account_id;

    if (!accountId) {
      const acct = await createConnectAccount(user.email);
      accountId = acct.id;
      const { error: upErr } = await sb
        .from("users")
        .update({ stripe_account_id: accountId, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (upErr) {
        console.error("[stripe/connect/start] users.update failed:", upErr.message);
        return NextResponse.json({ error: "Impossible d'enregistrer le compte Stripe." }, { status: 500 });
      }
    }

    const root = baseUrl(req);
    const link = await createOnboardingLink(
      accountId,
      `${root}/api/stripe/connect/return?account_id=${accountId}`,
      `${root}/api/stripe/connect/return?account_id=${accountId}&refresh=1`
    );

    return NextResponse.json({ url: link.url, account_id: accountId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/stripe/connect/start] exception:", msg);
    return NextResponse.json({ error: "Création du compte Stripe Connect impossible." }, { status: 500 });
  }
}
