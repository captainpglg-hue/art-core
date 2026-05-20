// ============================================================================
// GET /api/stripe/connect/return
// ----------------------------------------------------------------------------
// Endpoint de retour après l'onboarding Stripe Connect. Stripe redirige vers
// cette URL une fois l'utilisateur revenu (succès, refresh ou abandon).
// On redirige simplement vers /art-core/wallet pour que la carte
// <StripeConnectCard> re-fetch le statut. Pas de DB write — c'est le flag
// charges_enabled côté Stripe qui fait foi (lu par /api/stripe/connect/status).
//
// Query :
//   - account_id : id du compte Connect (info, pas utilisé pour redirect)
//   - refresh    : présent si l'utilisateur revient via le refresh_url
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh");
  const status = refresh ? "refresh" : "done";

  const dest = new URL("/art-core/wallet", url);
  dest.searchParams.set("stripe_onboarding", status);

  return NextResponse.redirect(dest);
}
