import { NextRequest, NextResponse } from "next/server";
import { getArtworkById, getGaugeEntries, getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = getArtworkById(id);
  if (!artwork) {
    return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });
  }

  const gaugeEntries = getGaugeEntries(id);
  const photos = JSON.parse(artwork.photos || "[]");

  // Get offers
  const offers = getDb()
    .prepare(
      `SELECT o.*, u.name as buyer_name FROM offers o JOIN users u ON o.buyer_id = u.id
       WHERE o.artwork_id = ? ORDER BY o.created_at DESC`
    )
    .all(id) as any[];

  // Get betting markets
  const markets = getDb()
    .prepare("SELECT * FROM betting_markets WHERE artwork_id = ? ORDER BY created_at DESC")
    .all(id) as any[];

  return NextResponse.json({
    artwork: { ...artwork, photos },
    gaugeEntries,
    offers,
    markets,
  });
}
