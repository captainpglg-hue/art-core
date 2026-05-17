import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getUserByToken, getDb } from "@/lib/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * POST /api/purchase/confirm
 * Body: { payment_intent_id: string }
 *
 * Appelé par le client APRÈS la confirmation de paiement Stripe (alternative au
 * webhook, qui est désactivé tant que STRIPE_WEBHOOK_SECRET n'est pas configuré).
 * On re-vérifie le status auprès de l'API Stripe — jamais de confiance dans le client.
 *
 * Pipeline :
 *   1. Vérifie côté Stripe : pi.status === "succeeded"
 *   2. Idempotence : si l'œuvre est déjà sold ET par ce buyer → retry, on renvoie OK
 *   3. CAS atomique : UPDATE artworks SET sold WHERE status='for_sale'
 *   4. Si CAS échoue → un autre acheteur a gagné → REMBOURSEMENT AUTO + 409
 *   5. INSERT transactions (avec split 90/10 en cents) — UNIQUE sur stripe_payment_intent_id
 *   6. INSERT ownership_transfers (avec les VRAIES colonnes de la table : price, pas sale_price)
 *   7. INSERT notifications vendeur + acheteur
 *
 * Note sur le split : la breakdown affichée sur la page œuvre annonce 90% artiste / 10%
 * plateforme. C'est ce qui est appliqué ici (cohérent avec la promesse UI). Le CLAUDE.md
 * mentionne 25% de commission — à arbitrer business, mais pas modifié ici pour rester
 * aligné avec ce que l'acheteur a vu au checkout.
 *
 * IMPORTANT : ce endpoint ne déclenche AUCUN transfert d'argent à l'artiste. Le PaymentIntent
 * est de type "simple" (toute la somme va au compte plateforme Stripe). Le payout artiste
 * doit être implémenté via Stripe Connect + transfers — workstream séparé.
 */

const PLATFORM_FEE_RATE = 0.10; // 10% — aligné sur l'affichage page œuvre

interface PiMeta {
  artwork_id?: string;
  buyer_id?: string;
}

/** Branche "race perdue" : rembourse l'acheteur via Stripe et notifie en fallback si refund KO. */
async function handleRaceLost(
  sb: SupabaseClient<Database>,
  pi: Stripe.PaymentIntent,
  buyer_id: string,
  artwork_id: string,
  artworkTitle: string,
  finalPrice: number
): Promise<NextResponse> {
  console.warn(
    `[purchase/confirm] Race lost — artwork ${artwork_id} already sold to other buyer. ` +
      `Auto-refunding PI ${pi.id} for buyer ${buyer_id}`
  );
  let refunded = false;
  try {
    await stripe.refunds.create({
      payment_intent: pi.id,
      reason: "duplicate",
      metadata: { artwork_id, buyer_id, cause: "artwork_sold_to_other_buyer" },
    });
    refunded = true;
  } catch (refundErr) {
    const msg = refundErr instanceof Error ? refundErr.message : String(refundErr);
    console.error(
      `[purchase/confirm] AUTO-REFUND FAILED for PI ${pi.id} — manual refund required:`,
      msg
    );
    await sb
      .from("notifications")
      .insert({
        user_id: buyer_id,
        type: "refund_pending",
        title: "Achat non finalisé — remboursement en cours",
        body: `${artworkTitle} a été vendue à un autre acheteur juste avant votre paiement. Notre équipe procède au remboursement manuel sous 24 h.`,
        data: {
          artwork_id,
          payment_intent_id: pi.id,
          refund_failed: true,
          amount: finalPrice,
        },
      })
      .then(({ error }) => {
        if (error) console.warn("[purchase/confirm] notif refund_pending failed:", error.message);
      });
  }
  return NextResponse.json(
    {
      error: refunded
        ? "Cette œuvre vient d'être achetée par un autre acheteur. Votre paiement a été remboursé automatiquement."
        : "Cette œuvre vient d'être achetée par un autre acheteur. Le remboursement est en cours de traitement par notre équipe.",
      status: "sold_to_other",
      refunded,
    },
    { status: 409 }
  );
}

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

    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (!pi) return NextResponse.json({ error: "PaymentIntent introuvable" }, { status: 404 });

    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { error: `Paiement non confirmé par Stripe (status=${pi.status})`, status: pi.status },
        { status: 409 }
      );
    }

    const meta: PiMeta = pi.metadata ?? {};
    const artwork_id = meta.artwork_id;
    const buyer_id = meta.buyer_id;
    if (!artwork_id || !buyer_id) {
      return NextResponse.json({ error: "PaymentIntent sans metadata artwork/buyer" }, { status: 400 });
    }
    if (buyer_id !== user.id) {
      return NextResponse.json({ error: "Ce paiement ne vous appartient pas" }, { status: 403 });
    }

    const amountCents = pi.amount_received || pi.amount || 0;
    const finalPrice = amountCents / 100;

    const sb = getDb();

    // ─── 1. Charge l'œuvre (avant CAS) pour idempotence + title/owner_id
    const { data: artBefore } = await sb
      .from("artworks")
      .select("id, owner_id, artist_id, status, title, buyer_id")
      .eq("id", artwork_id)
      .maybeSingle();

    if (!artBefore) {
      return NextResponse.json({ error: "Œuvre introuvable" }, { status: 404 });
    }

    // ─── 2. Idempotence par buyer_id : si déjà vendue à CE buyer, c'est un retry → OK
    //     Si déjà vendue à QUELQU'UN D'AUTRE, on est en race lost → refund
    if (artBefore.status === "sold") {
      if (artBefore.buyer_id === buyer_id) {
        return NextResponse.json({
          success: true,
          idempotent: true,
          artwork_id,
          status: "sold",
        });
      }
      return handleRaceLost(sb, pi, buyer_id, artwork_id, artBefore.title, finalPrice);
    }

    // ─── 3. CAS atomique : on ne marque sold QUE si encore for_sale.
    const { data: updatedRows, error: updErr } = await sb
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
      .eq("id", artwork_id)
      .eq("status", "for_sale")
      .select("id");

    if (updErr) {
      console.error("[purchase/confirm] UPDATE artworks failed:", updErr.message);
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    // ─── 4. CAS échoué : quelqu'un a pris l'œuvre entre la lecture (étape 1) et le CAS.
    //     Re-fetch pour distinguer "même buyer en concurrent" (retry idempotent) vs autre buyer (refund).
    if (!updatedRows || updatedRows.length === 0) {
      const { data: artAfter } = await sb
        .from("artworks")
        .select("buyer_id")
        .eq("id", artwork_id)
        .maybeSingle();
      if (artAfter?.buyer_id === buyer_id) {
        return NextResponse.json({
          success: true,
          idempotent: true,
          artwork_id,
          status: "sold",
        });
      }
      return handleRaceLost(sb, pi, buyer_id, artwork_id, artBefore.title, finalPrice);
    }

    // ─── 5. Succès — INSERT transactions (alimente /art-core/orders)
    //
    //     Schéma DB RÉEL vérifié via Supabase MCP : la table contient des colonnes
    //     anglaises (artwork_id, buyer_id, seller_id, amount, commission_platform,
    //     commission_artist_royalty, status) ET des colonnes françaises héritées
    //     (oeuvre_id, vendeur_id, prix_vente, royalty_artiste, type_transaction,
    //     stripe_payment_id). On peuple les anglaises (utilisées par /orders) +
    //     type_transaction + stripe_payment_id (utiles pour traçabilité / idempotence).
    //
    //     Amounts en EUR décimal (la colonne `amount` est NUMERIC, pas BIGINT cents).
    const isResale = artBefore.artist_id !== artBefore.owner_id;
    const platformFee = Math.round(finalPrice * PLATFORM_FEE_RATE * 100) / 100;
    const artistRoyalty = isResale ? 0 : Math.round((finalPrice - platformFee) * 100) / 100;

    // Idempotence : si une transaction existe déjà pour ce PI, on n'insère pas deux fois.
    const { data: existingTx } = await sb
      .from("transactions")
      .select("id")
      .eq("stripe_payment_id", pi.id)
      .maybeSingle();

    if (!existingTx) {
      const { error: txErr } = await sb.from("transactions").insert({
        artwork_id,
        buyer_id,
        seller_id: artBefore.owner_id,
        amount: finalPrice,
        commission_platform: platformFee,
        commission_artist_royalty: artistRoyalty,
        status: "completed",
        type_transaction: "purchase",
        stripe_payment_id: pi.id,
      });
      if (txErr) {
        console.error("[purchase/confirm] INSERT transactions failed:", txErr.message);
        // Non bloquant : l'achat est passé, l'œuvre est marquée sold, juste l'historique
        // /orders sera vide pour cet achat. Logguer pour intervention.
      }
    }

    // ─── 6. Historique de propriété (best-effort, colonnes alignées sur la vraie table)
    if (artBefore.owner_id) {
      await sb
        .from("ownership_transfers")
        .insert({
          artwork_id,
          from_user_id: artBefore.owner_id,
          to_user_id: buyer_id,
          transfer_type: "sale",
          price: amountCents,
          notes: `Stripe PaymentIntent: ${pi.id}`,
        })
        .then(({ error }) => {
          if (error)
            console.warn("[purchase/confirm] ownership_transfers insert failed:", error.message);
        });
    }

    // ─── 7. Notifications (best-effort)
    await sb
      .from("notifications")
      .insert([
        {
          user_id: artBefore.owner_id,
          type: "artwork_sold",
          title: "Votre œuvre a été vendue !",
          body: `${artBefore.title} — ${finalPrice} €`,
          data: { artwork_id, title: artBefore.title, final_price: finalPrice },
        },
        {
          user_id: buyer_id,
          type: "purchase_confirmed",
          title: "Achat confirmé",
          body: `${artBefore.title} — ${finalPrice} €`,
          data: { artwork_id, title: artBefore.title, final_price: finalPrice },
        },
      ])
      .then(({ error }) => {
        if (error) console.warn("[purchase/confirm] notifications insert failed:", error.message);
      });

    return NextResponse.json({
      success: true,
      artwork_id,
      status: "sold",
      final_price: finalPrice,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[purchase/confirm] exception:", msg);
    return NextResponse.json({ error: "Erreur serveur — réessaie." }, { status: 500 });
  }
}
