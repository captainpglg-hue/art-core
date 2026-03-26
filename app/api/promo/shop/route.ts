import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function GET() {
  const sb = getDb();
  const { data: items } = await sb.from("promo_items").select("*").order("sort_order", { ascending: true });
  return NextResponse.json({ items: items || [] });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { artwork_id, promo_item_id, pay_with } = await req.json();
    if (!promo_item_id) return NextResponse.json({ error: "promo_item_id requis" }, { status: 400 });

    const sb = getDb();
    const { data: item } = await sb.from("promo_items").select("*").eq("id", promo_item_id).single();
    if (!item) return NextResponse.json({ error: "Offre non trouvee" }, { status: 404 });

    const payWith = pay_with || "points";

    if (payWith === "points") {
      if (user.points_balance < Number(item.cost_points)) {
        return NextResponse.json({ error: `Points insuffisants (${user.points_balance}/${item.cost_points})` }, { status: 400 });
      }
      await sb.from("users").update({ points_balance: Number(user.points_balance) - Number(item.cost_points) }).eq("id", user.id);

      const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sb.from("point_transactions").insert({
        id: ptId, user_id: user.id, amount: -Number(item.cost_points), type: "promo_purchase",
        reference_id: promo_item_id, description: `Promo: ${item.name}`,
      });
    }

    const ppId = `pp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + item.duration_hours * 3600000).toISOString();

    await sb.from("promo_purchases").insert({
      id: ppId, user_id: user.id, artwork_id: artwork_id || null,
      promo_item_id: promo_item_id, paid_with: payWith,
      amount_paid: payWith === "points" ? Number(item.cost_points) : Number(item.cost_euros),
      status: "active", expires_at: expiresAt,
    });

    // Apply effects
    if (artwork_id) {
      if (item.type === "boost_search") {
        await sb.from("artworks").update({ boost_active: true, boost_expires_at: expiresAt }).eq("id", artwork_id);
      } else if (["carousel", "story", "editorial", "geo_boost"].includes(item.type)) {
        await sb.from("artworks").update({ highlight_active: true, highlight_expires_at: expiresAt }).eq("id", artwork_id);
      }
    }

    // Notify
    const nId = `notif_${Date.now()}`;
    await sb.from("notifications").insert({
      id: nId, user_id: user.id, type: "promo", title: "Promotion activee !",
      message: `"${item.name}" est maintenant active.`, link: "/art-core/boutique-promotion",
    });

    return NextResponse.json({
      purchaseId: ppId,
      item: item.name,
      tier: item.tier,
      paid_with: payWith,
      amount: payWith === "points" ? Number(item.cost_points) : Number(item.cost_euros),
      expires_at: expiresAt,
      new_balance: payWith === "points" ? Number(user.points_balance) - Number(item.cost_points) : Number(user.points_balance),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
