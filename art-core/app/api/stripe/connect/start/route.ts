import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured, createConnectAccount, createOnboardingLink } from "@/lib/stripe";
import { getUserByToken, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    if (!isStripeConfigured()) return NextResponse.json({ error: "Stripe non configure cote serveur." }, { status: 503 });

    const sb = getDb();
    let accountId = user.stripe_account_id;
    if (!accountId) {
      const account = await createConnectAccount(user.email);
      accountId = account.id;
      const { error: updErr } = await sb.from("users").update({ stripe_account_id: accountId }).eq("id", user.id);
      if (updErr) {
        console.error("[stripe/connect/start] update users failed:", updErr.message);
        return NextResponse.json({ error: "Compte Stripe cree mais impossible a sauvegarder." }, { status: 500 });
      }
    }

    const origin = req.nextUrl.origin;
    const link = await createOnboardingLink(accountId, `${origin}/api/stripe/connect/return`, `${origin}/api/stripe/connect/return?refresh=1`);
    return NextResponse.json({ url: link.url, account_id: accountId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/stripe/connect/start] exception:", msg);
    return NextResponse.json({ error: "Impossible d initier l onboarding Stripe." }, { status: 500 });
  }
}
