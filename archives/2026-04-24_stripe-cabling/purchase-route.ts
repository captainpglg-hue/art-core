import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";
import { stripe, isStripeConfigured, createSimplePaymentIntent } from "@/lib/stripe";

/**
 * POST /api/purchase
 * Body: { artwork_id: string }
 *
 * Crée un Stripe PaymentIntent pour l'achat d'une œuvre.
 * Retourne { client_secret, payment_intent_id, amount_cents }.
 *
 * Mode actuel : SimplePaymentIntent (paiement direct vers la plateforme).
 * Le split 90/10 sera appliqué en DB au webhook success — cf. /api/webhooks/stripe.
 * Quand chaque artiste aura un Stripe Connect account, on basculera sur
 * createArtworkPaymentIntent avec transfer_data.destination pour un split automatique.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    // Stripe configuré ?
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Paiement temporairement indisponible (configuration Stripe manquante)." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const artwork_id: string | undefined = body.artwork_id;
    if (!artwork_id) {
      return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });
    }

    // Charger l'artwork
    const sb = getDb();
    const { data: artwork, error } = await sb
      .from("artworks")
      .select("id, title, price, status, is_public, is_for_sale, artist_id, owner_id")
      .eq("id", artwork_id)
      .maybeSingle();

    if (error || !artwork) {
      return NextResponse.json({ error: "Œuvre introuvable" }, { status: 404 });
    }
    if (artwork.status === "sold") {
      return NextResponse.json({ error: "Cette œuvre a déjà été vendue" }, { status: 409 });
    }
    if (!artwork.is_public || !artwork.is_for_sale) {
      return NextResponse.json({ error: "Cette œuvre n'est pas en vente" }, { status: 409 });
    }
    if (artwork.artist_id === user.id || artwork.owner_id === user.id) {
      return NextResponse.json({ error: "Tu ne peux pas acheter ta propre œuvre" }, { status: 409 });
    }
    const price = Number(artwork.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Prix invalide" }, { status: 409 });
    }

    const amount_cents = Math.round(price * 100);

    const intent = await createSimplePaymentIntent({
      amountCents: amount_cents,
      artworkId: artwork.id,
      buyerId: user.id,
      isResale: artwork.artist_id !== artwork.owner_id,
    });

    return NextResponse.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount_cents,
      currency: intent.currency,
    });
  } catch (e: any) {
    console.error("[POST /api/purchase] exception:", e?.message);
    return NextResponse.json(
      { error: "Impossible de créer l'intention de paiement — réessaie plus tard." },
      { status: 500 }
    );
  }
}
