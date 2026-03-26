import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { hash } = await req.json();
    if (!hash) {
      return NextResponse.json({ error: "Hash requis" }, { status: 400 });
    }

    const sb = getDb();

    // Search artwork by blockchain_hash in Supabase
    const { data: artwork } = await sb
      .from("artworks")
      .select("*, artist:users!artworks_artist_id_fkey(full_name)")
      .eq("blockchain_hash", hash)
      .single();

    if (!artwork) {
      return NextResponse.json({
        verified: false,
        on_chain: false,
        error: "Aucune oeuvre trouvee avec ce hash",
      });
    }

    let photos = typeof artwork.photos === "string"
      ? JSON.parse(artwork.photos || "[]")
      : artwork.photos || [];
    if (photos.length === 0 && artwork.image_url) photos = [artwork.image_url];

    return NextResponse.json({
      verified: true,
      on_chain: false,
      artwork: {
        id: artwork.id,
        title: artwork.title,
        artist_name: artwork.artist?.full_name || "Artiste",
        certification_date: artwork.certification_date,
        blockchain_hash: artwork.blockchain_hash,
        tx_hash: artwork.blockchain_tx_id,
        explorer_url: "#",
        photos,
      },
      blockchain: null,
      config: {
        network: "simulation",
        simulation: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const hash = new URL(req.url).searchParams.get("hash");
  if (!hash) return NextResponse.json({ error: "Hash requis" }, { status: 400 });

  const body = JSON.stringify({ hash });
  const fakeReq = new NextRequest(req.url, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
  return POST(fakeReq);
}
