import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const items = db.prepare("SELECT * FROM promo_items ORDER BY sort_order ASC").all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id, promo_item_id, pay_with } = await req.json();
    if (!promo_item_id) return NextResponse.json({ error: "promo_item_id requis" }, { status: 400 });

    const db = getDb();
    const item = db.prepare("SELECT * FROM promo_items WHERE id = ?").get(promo_item_id) as any;
    if (!item) return NextResponse.json({ error: "Offre non trouvée" }, { status: 404 });

    const payWith = pay_with || "points";

    if (payWith === "points") {
      if (user.points_balance < item.cost_points) {
        return NextResponse.json({ error: `Points insuffisants (${user.points_balance}/${item.cost_points})` }, { status: 400 });
      }
      db.prepare("UPDATE users SET points_balance = points_balance - ? WHERE id = ?").run(item.cost_points, user.id);

      const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'promo_purchase', ?, ?)")
        .run(ptId, user.id, -item.cost_points, promo_item_id, `Promo: ${item.name}`);
    }
    // For euros: in production Stripe would handle this. For now we just record it.

    const ppId = `pp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + item.duration_hours * 3600000).toISOString();

    db.prepare("INSERT INTO promo_purchases (id, user_id, artwork_id, promo_item_id, paid_with, amount_paid, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)")
      .run(ppId, user.id, artwork_id || null, promo_item_id, payWith, payWith === "points" ? item.cost_points : item.cost_euros, expiresAt);

    // Apply effects
    if (artwork_id) {
      if (item.type === "boost_search") {
        db.prepare("UPDATE artworks SET boost_active = 1, boost_expires_at = ? WHERE id = ?").run(expiresAt, artwork_id);
      } else if (["carousel", "story", "editorial", "geo_boost"].includes(item.type)) {
        db.prepare("UPDATE artworks SET highlight_active = 1, highlight_expires_at = ? WHERE id = ?").run(expiresAt, artwork_id);
      }
    }

    // Notify
    const nId = `notif_${Date.now()}`;
    db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'promo', 'Promotion activée !', ?, '/art-core/boutique-promotion')")
      .run(nId, user.id, `"${item.name}" est maintenant active.`);

    return NextResponse.json({
      purchaseId: ppId,
      item: item.name,
      tier: item.tier,
      paid_with: payWith,
      amount: payWith === "points" ? item.cost_points : item.cost_euros,
      expires_at: expiresAt,
      new_balance: payWith === "points" ? user.points_balance - item.cost_points : user.points_balance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
