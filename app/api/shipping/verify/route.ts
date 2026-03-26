import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";
import crypto from "crypto";

// POST: Verify reception — compare hash pre/post delivery
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { shipping_id, reception_photo_base64 } = await req.json();
    if (!shipping_id) return NextResponse.json({ error: "shipping_id requis" }, { status: 400 });

    const sb = getDb();
    const { data: shipping } = await sb.from("shipping").select("*").eq("id", shipping_id).single();
    if (!shipping) return NextResponse.json({ error: "Expedition non trouvee" }, { status: 404 });
    if (shipping.buyer_id !== user.id) return NextResponse.json({ error: "Non autorise" }, { status: 403 });

    // Generate hash from reception photo
    let hashPost = "";
    if (reception_photo_base64) {
      const buffer = Buffer.from(reception_photo_base64, "base64");
      hashPost = "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
    }

    const hashPre = shipping.hash_pre_shipping;
    // Compare hashes — if no pre-shipping hash, auto-verify
    const verified = !hashPre || hashPre === hashPost || !reception_photo_base64;

    if (verified) {
      // Mark as verified, update delivery
      await sb.from("shipping").update({
        status: "delivered",
        hash_post_delivery: hashPost || null,
        integrity_verified: true,
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", shipping_id);

      // Transfer ownership in artworks
      await sb.from("artworks").update({
        owner_id: user.id,
        updated_at: new Date().toISOString(),
      }).eq("id", shipping.artwork_id);

      // Notify seller
      await sb.from("notifications").insert({
        user_id: shipping.seller_id,
        type: "delivery_verified",
        title: "Livraison confirmee",
        body: "L'acheteur a confirme la reception. Paiement libere.",
        action_url: "/art-core/orders",
      });

      return NextResponse.json({
        verified: true,
        message: "Oeuvre authentifiee — paiement libere",
        hash_match: hashPre === hashPost,
      });
    } else {
      // Open dispute
      await sb.from("shipping").update({
        status: "disputed",
        hash_post_delivery: hashPost,
        integrity_verified: false,
        updated_at: new Date().toISOString(),
      }).eq("id", shipping_id);

      await sb.from("disputes").insert({
        shipping_id,
        reason: "Difference de hash detectee entre pre-expedition et post-livraison",
        hash_difference: true,
        status: "open",
      });

      // Notify both parties
      for (const uid of [shipping.seller_id, shipping.buyer_id]) {
        await sb.from("notifications").insert({
          user_id: uid,
          type: "dispute_opened",
          title: "Litige ouvert",
          body: "Une difference a ete detectee. Un litige a ete ouvert automatiquement.",
          action_url: "/art-core/orders",
        });
      }

      return NextResponse.json({
        verified: false,
        dispute_opened: true,
        message: "Difference detectee — litige ouvert automatiquement",
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
