import { NextRequest, NextResponse } from "next/server";
import { getArtworkById, getGaugeEntries, getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = await getArtworkById(id);
  if (!artwork) {
    return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });
  }

  const gaugeEntries = await getGaugeEntries(id);
  const photos = typeof artwork.photos === "string" ? JSON.parse(artwork.photos || "[]") : (artwork.photos || []);

  // Get offers
  const sb = getDb();
  const { data: offersRaw } = await sb
    .from("offers")
    .select("*, buyer:users!offers_buyer_id_fkey(full_name)")
    .eq("artwork_id", id)
    .order("created_at", { ascending: false });

  const offers = (offersRaw || []).map((o: any) => ({
    ...o,
    buyer_name: o.buyer?.full_name,
    buyer: undefined,
  }));

  // Get betting markets
  const { data: markets } = await sb
    .from("betting_markets")
    .select("*")
    .eq("artwork_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    artwork: { ...artwork, photos },
    gaugeEntries,
    offers,
    markets: markets || [],
  });
}
