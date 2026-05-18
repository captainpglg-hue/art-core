import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";
import { stripe, isStripeConfigured, createSimplePaymentIntent, createArtworkPaymentIntent } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session expiree" }, { status: 401 });

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Paiement temporairement indisponible." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const artwork_id: string | undefined = body.artwork_id;
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const sb = getDb();
    const { data: artwork, error } = await sb
      .from("artworks")
      .select("id, title, price, status, is_public, is_for_sale, artist_id, owner_id")
      .eq("id", artwork_id)
      .maybeSingle();

    if (error || !artwork) return NextResponse.json({ error: "Oeuvre introuvable" }, { status: 404 });
    if (artwork.status === "sold") return NextResponse.json({ error: "Cette oeuvre a deja ete vendue" }, { status: 409 });
    if (!artwork.is_public || !artwork.is_for_sale) return NextResponse.json({ error: "Cette oeuvre n est pas en vente" }, { status: 409 });
    // Note : l'auto-achat (artiste = acheteur) est volontairement autorisé pour le rachat / retrait d'œuvre.

    const price = Number(artwork.price);
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Prix invalide" }, { status: 409 });

    const amount_cents = Math.round(price * 100);
    const isResale = artwork.artist_id !== artwork.owner_id;

    const sellerId = artwork.owner_id ?? artwork.artist_id;
    let sellerStripeId: string | null = null;
    if (sellerId) {
      const { data: seller } = await sb.from("users").select("stripe_account_id").eq("id", sellerId).maybeSingle();
      sellerStripeId = seller?.stripe_account_id ?? null;
    }

    let canSplit = false;
    if (sellerStripeId) {
      try {
        const acc = await stripe.accounts.retrieve(sellerStripeId);
        canSplit = !!acc.charges_enabled;
      } catch (e) {
        console.warn("[purchase] Stripe account lookup failed:", e instanceof Error ? e.message : e);
      }
    }

    const intent = canSplit && sellerStripeId
      ? await createArtworkPaymentIntent({ amountCents: amount_cents, sellerAccountId: sellerStripeId, artworkId: artwork.id, buyerId: user.id, isResale })
      : await createSimplePaymentIntent({ amountCents: amount_cents, artworkId: artwork.id, buyerId: user.id, isResale });

    return NextResponse.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount_cents,
      currency: intent.currency,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/purchase] exception:", msg);
    return NextResponse.json({ error: "Impossible de creer l intention de paiement." }, { status: 500 });
  }
}
