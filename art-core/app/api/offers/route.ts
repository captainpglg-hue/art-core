import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id, amount, message } = await req.json();
    if (!artwork_id || !amount) {
      return NextResponse.json({ error: "artwork_id et amount requis" }, { status: 400 });
    }

    const id = `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    getDb().prepare(
      "INSERT INTO offers (id, artwork_id, buyer_id, amount, message) VALUES (?, ?, ?, ?, ?)"
    ).run(id, artwork_id, user.id, amount, message || "");

    // Notify artist
    const artwork = getDb().prepare("SELECT title, artist_id FROM artworks WHERE id = ?").get(artwork_id) as any;
    if (artwork) {
      const nId = `notif_${Date.now()}`;
      getDb().prepare(
        "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'offer', 'Nouvelle offre', ?, ?)"
      ).run(nId, artwork.artist_id, `${user.name} propose ${amount}€ pour "${artwork.title}".`, `/art-core/oeuvre/${artwork_id}`);
    }

    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
