import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, isStripeConfigured } from "@/lib/stripe";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe
 *
 * Vercel/Next.js reçoit les événements Stripe signés. On vérifie la signature
 * avec STRIPE_WEBHOOK_SECRET, puis on traite les events :
 *
 *   - payment_intent.succeeded
 *       → UPDATE artworks SET status='sold', buyer_id, final_sale_price, sold_at
 *       → INSERT ownership_transfers (history)
 *
 *   - payment_intent.payment_failed : log seulement (le client voit l'erreur direct)
 *
 * Les autres events sont ignorés (200 OK) pour ne pas bloquer la retry logic Stripe.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    console.warn("[webhooks/stripe] Stripe non configuré, event ignoré");
    return NextResponse.json({ received: true, ignored: "stripe_not_configured" });
  }

  const signature = req.headers.get("stripe-signature") || "";
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  // Important : Stripe exige le body BRUT (pas parsé) pour la vérification de signature
  const payload = await req.text();

  let event: any;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err: any) {
    console.error("[webhooks/stripe] signature invalide:", err?.message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const sb = getDb();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const artwork_id: string | undefined = pi.metadata?.artwork_id;
        const buyer_id: string | undefined = pi.metadata?.buyer_id;
        const amountCents: number = pi.amount_received || pi.amount || 0;
        const finalPrice = amountCents / 100;

        if (!artwork_id || !buyer_id) {
          console.warn("[webhooks/stripe] payment_intent.succeeded sans metadata artwork_id/buyer_id", pi.id);
          return NextResponse.json({ received: true, warning: "no_metadata" });
        }

        // Récupérer l'ancien owner pour historique
        const { data: artBefore } = await sb
          .from("artworks").select("id, owner_id, artist_id, status").eq("id", artwork_id).maybeSingle();

        if (artBefore?.status === "sold") {
          console.warn(`[webhooks/stripe] artwork ${artwork_id} déjà sold — idempotence, rien à faire`);
          return NextResponse.json({ received: true, idempotent: true });
        }

        // Mise à jour de l'œuvre
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
          console.error("[webhooks/stripe] UPDATE artworks failed:", updErr.message);
          return NextResponse.json({ error: updErr.message }, { status: 500 });
        }

        // Historique de propriété
        if (artBefore?.owner_id) {
          const { error: histErr } = await sb.from("ownership_transfers").insert({
            artwork_id,
            from_user_id: artBefore.owner_id,
            to_user_id: buyer_id,
            sale_price: finalPrice,
            transfer_type: "sale",
            stripe_payment_intent_id: pi.id,
            transferred_at: new Date().toISOString(),
          });
          if (histErr) console.warn("[webhooks/stripe] ownership_transfers insert failed (non bloquant):", histErr.message);
        }

        // Notifications (best-effort, non bloquantes)
        // Schéma DB : type (text) + data (jsonb). Mapping kind→type, artwork_id→data.artwork_id.
        try {
          const notifs: Array<{
            user_id: string;
            type: string;
            title: string;
            body: string;
            data: { artwork_id: string; final_price: number };
          }> = [
            {
              user_id: buyer_id,
              type: "purchase_confirmed",
              title: "Achat confirmé",
              body: `Votre achat de ${finalPrice} € est confirmé`,
              data: { artwork_id, final_price: finalPrice },
            },
          ];
          if (artBefore?.owner_id) {
            notifs.unshift({
              user_id: artBefore.owner_id,
              type: "artwork_sold",
              title: "Votre œuvre a été vendue !",
              body: `Vente de ${finalPrice} €`,
              data: { artwork_id, final_price: finalPrice },
            });
          }
          await sb.from("notifications").insert(notifs);
        } catch (e: any) {
          console.warn("[webhooks/stripe] notifications insert failed (non bloquant):", e?.message);
        }

        console.log(`[webhooks/stripe] artwork ${artwork_id} marked sold for ${finalPrice} EUR (buyer ${buyer_id})`);
        return NextResponse.json({ received: true, artwork_id, status: "sold" });
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        console.warn(`[webhooks/stripe] payment failed: ${pi.id} — reason: ${pi.last_payment_error?.message}`);
        return NextResponse.json({ received: true, failed: true });
      }

      default:
        return NextResponse.json({ received: true, type: event.type, ignored: true });
    }
  } catch (e: any) {
    console.error("[webhooks/stripe] handler exception:", e?.message);
    return NextResponse.json({ error: e?.message || "handler failure" }, { status: 500 });
  }
}
