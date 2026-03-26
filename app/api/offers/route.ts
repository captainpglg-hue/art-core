import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { artwork_id, amount, message } = await req.json();
    if (!artwork_id || !amount) {
      return NextResponse.json({ error: "artwork_id et amount requis" }, { status: 400 });
    }

    const sb = getDb();
    const id = `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sb.from("offers").insert({
      id, artwork_id, buyer_id: user.id, amount, message: message || "",
    });

    // Notify artist
    const { data: artwork } = await sb.from("artworks").select("title, artist_id").eq("id", artwork_id).single();
    if (artwork) {
      const nId = `notif_${Date.now()}`;
      await sb.from("notifications").insert({
        id: nId, user_id: artwork.artist_id, type: "offer", title: "Nouvelle offre",
        message: `${user.name} propose ${amount}E pour "${artwork.title}".`,
        link: `/art-core/oeuvre/${artwork_id}`,
      });
    }

    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
