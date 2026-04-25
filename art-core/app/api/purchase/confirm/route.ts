import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getUserByToken, getDb } from "@/lib/db";

/**
 * POST /api/purchase/confirm
 * Body: { payment_intent_id: string }
 *
 * Alternative au webhook Stripe : appelé par le client APRÈS la confirmation
 * de paiement. On re-vérifie le status directement auprès de l'API Stripe
 * (pas de confiance aveugle dans ce que dit le client).
 *
 * Si Stripe confirme que le paiement est "succeeded" :
 *   - UPDATE artworks : status='sold', buyer_id, owner_id, final_sale_price, sold_at
 *   - INSERT ownership_transfers
 *   - INSERT notifications (vendeur + acheteur)
 *
 * Idempotent : si l'œuvre est déjà sold, retourne 200 sans rien faire.
 *
 * Le webhook /api/webhooks/stripe reste en place en backup pour capturer les
 * paiements où l'utilisateur quitterait la page avant ce confirm.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const payment_intent_id: string | undefined = body.payment_intent_id;
    if (!payment_intent_id) {
      return NextResponse.json({ error: "payment_intent_id requis" }, { status: 400 });
    }

    // Récupérer le PaymentIntent directement depuis Stripe — source de vérité
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (!pi) {
      return NextResponse.json({ error: "PaymentIntent introuvable" }, { status: 404 });
    }

    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { error: `Paiement non confirmé par Stripe (status=${pi.status})`, status: pi.status },
        { status: 409 }
      );
    }

    const artwork_id = pi.metadata?.artwork_id;
    const buyer_id = pi.metadata?.buyer_id;
    if (!artwork_id || !buyer_id) {
      return NextResponse.json({ error: "PaymentIntent sans metadata artwork/buyer" }, { status: 400 });
    }

    // Sécurité : le user qui confirme doit être le buyer déclaré dans les metadata
    if (buyer_id !== user.id) {
      return NextResponse.json({ error: "Ce paiement ne vous appartient pas" }, { status: 403 });
    }

    const amountCents = pi.amount_received || pi.amount || 0;
    const finalPrice = amountCents / 100;

    const sb = getDb();
    const { data: artBefore } = await sb
      .from("artworks").select("id, owner_id, artist_id, status, title")
      .eq("id", artwork_id).maybeSingle();

    if (!artBefore) {
      return NextResponse.json({ error: "Œuvre introuvable" }, { status: 404 });
    }

    // Idempotence : déjà sold, rien à faire
    if (artBefore.status === "sold") {
      return NextResponse.json({
        success: true,
        idempotent: true,
        artwork_id,
        status: "sold",
      });
    }

    const { error: updErr } = await sb
      .from("artworks")
      .update({
        status: "sold",
        is_for_sale: false,
        buyer_id,
        owner_id: buyer_id,
        final_sale_price: finalPrice,
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", artwork_id);

    if (updErr) {
      console.error("[purchase/confirm] UPDATE artworks failed:", updErr.message);
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    // Historique de propriété
    if (artBefore.owner_id) {
      await sb.from("ownership_transfers").insert({
        artwork_id,
        from_user_id: artBefore.owner_id,
        to_user_id: buyer_id,
        sale_price: finalPrice,
        transfer_type: "sale",
        stripe_payment_intent_id: pi.id,
        transferred_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.warn("[purchase/confirm] ownership_transfers insert failed:", error.message);
      });
    }

    // Notifications (best-effort)
    // NOTE: même bug latent qu'au webhook stripe — `kind` et `artwork_id` hors schéma
    // notifications (qui a `type` et `data`). Cast pour préserver runtime, à mapper plus tard.
    await sb.from("notifications").insert([
      {
        user_id: artBefore.owner_id,
        kind: "artwork_sold",
        title: "Votre œuvre a été vendue !",
        body: `${artBefore.title} — ${finalPrice} €`,
        artwork_id,
      },
      {
        user_id: buyer_id,
        kind: "purchase_confirmed",
        title: "Achat confirmé",
        body: `${artBefore.title} — ${finalPrice} €`,
        artwork_id,
      },
    ] as any).then(({ error }) => {
      if (error) console.warn("[purchase/confirm] notifications insert failed:", error.message);
    });

    return NextResponse.json({
      success: true,
      artwork_id,
      status: "sold",
      final_price: finalPrice,
    });
  } catch (e: any) {
    console.error("[purchase/confirm] exception:", e?.message);
    return NextResponse.json({ error: "Erreur serveur — réessaie." }, { status: 500 });
  }
}
