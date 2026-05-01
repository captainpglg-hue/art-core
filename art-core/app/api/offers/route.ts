import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getUserByToken, query, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id, amount, message } = await req.json();
    if (!artwork_id || !amount) {
      return NextResponse.json({ error: "artwork_id et amount requis" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await query(
      "INSERT INTO offers (id, artwork_id, buyer_id, amount, message) VALUES (?, ?, ?, ?, ?)",
      [id, artwork_id, user.id, amount, message || ""]
    );

    // Notify artist
    const artwork = await queryOne("SELECT title, artist_id FROM artworks WHERE id = ?", [artwork_id]) as any;
    if (artwork) {
      const nId = crypto.randomUUID();
      await query(
        "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'offer', 'Nouvelle offre', ?, ?)",
        [nId, artwork.artist_id, `${user.full_name || user.username} propose ${amount}€ pour "${artwork.title}".`, `/art-core/oeuvre/${artwork_id}`]
      );
    }

    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
