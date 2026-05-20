// ============================================================================
// GET /api/stripe/connect/status
// ----------------------------------------------------------------------------
// Renvoie l'état du compte Stripe Connect de l'utilisateur connecté :
//   { configured, account_id, charges_enabled, payouts_enabled,
//     details_submitted, requirements_due, can_receive_payments }
//
// `can_receive_payments` = charges_enabled && payouts_enabled : c'est le flag
// qu'on regarde côté `/api/purchase` pour décider d'utiliser
// createArtworkPaymentIntent (split auto) plutôt que createSimplePaymentIntent.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserByToken } from "@/lib/db";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const accountId = (user as { stripe_account_id: string | null }).stripe_account_id;

    if (!isStripeConfigured()) {
      return NextResponse.json({
        configured: false,
        account_id: accountId,
        can_receive_payments: false,
      });
    }

    if (!accountId) {
      return NextResponse.json({
        configured: true,
        account_id: null,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        requirements_due: [],
        can_receive_payments: false,
      });
    }

    const acct = await stripe.accounts.retrieve(accountId);
    const requirementsDue = [
      ...(acct.requirements?.currently_due ?? []),
      ...(acct.requirements?.past_due ?? []),
    ];

    return NextResponse.json({
      configured: true,
      account_id: acct.id,
      charges_enabled: acct.charges_enabled,
      payouts_enabled: acct.payouts_enabled,
      details_submitted: acct.details_submitted,
      requirements_due: requirementsDue,
      can_receive_payments: acct.charges_enabled && acct.payouts_enabled,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/stripe/connect/status] exception:", msg);
    return NextResponse.json({ error: "Lecture du statut Stripe impossible." }, { status: 500 });
  }
}
