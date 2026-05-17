import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getUserByToken } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session expiree" }, { status: 401 });

    if (!user.stripe_account_id) {
      return NextResponse.json({ connected: false, charges_enabled: false, payouts_enabled: false, details_submitted: false, requirements_due: [] });
    }
    if (!isStripeConfigured()) return NextResponse.json({ error: "Stripe non configure cote serveur." }, { status: 503 });

    const acc = await stripe.accounts.retrieve(user.stripe_account_id);
    return NextResponse.json({
      connected: true,
      account_id: acc.id,
      charges_enabled: !!acc.charges_enabled,
      payouts_enabled: !!acc.payouts_enabled,
      details_submitted: !!acc.details_submitted,
      requirements_due: acc.requirements?.currently_due ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/stripe/connect/status] exception:", msg);
    return NextResponse.json({ error: "Impossible de recuperer le statut Stripe." }, { status: 500 });
  }
}
