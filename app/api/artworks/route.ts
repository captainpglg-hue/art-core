import { NextRequest, NextResponse } from "next/server";
import { getArtworks, countArtworks, getDb, getUserByToken } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const artistId = searchParams.get("artist_id") || undefined;

  const artworks = await getArtworks({ status, category, search, sort, limit, offset, artistId });
  const total = await countArtworks({ status, category, search, artistId });

  const parsed = artworks.map((a: any) => ({
    ...a,
    photos: typeof a.photos === "string" ? JSON.parse(a.photos || "[]") : (a.photos || []),
  }));

  // Enrich certified artworks with merchant name from police_register_entries + merchants
  const certifiedIds = parsed.filter((a: any) => a.blockchain_hash).map((a: any) => a.id);
  if (certifiedIds.length > 0) {
    try {
      const sb = getDb();
      const { data: entries } = await sb
        .from("police_register_entries")
        .select("artwork_id, merchant_id")
        .in("artwork_id", certifiedIds)
        .not("merchant_id", "is", null);

      if (entries && entries.length > 0) {
        const merchantIds = Array.from(new Set(entries.map((e: any) => e.merchant_id)));
        const { data: merchants } = await sb
          .from("merchants")
          .select("id, raison_sociale")
          .in("id", merchantIds);

        const merchantMap = new Map((merchants || []).map((m: any) => [m.id, m.raison_sociale]));
        const artworkMerchant = new Map(entries.map((e: any) => [e.artwork_id, merchantMap.get(e.merchant_id)]));

        for (const art of parsed) {
          if (artworkMerchant.has(art.id)) {
            art.merchant_name = artworkMerchant.get(art.id);
          }
        }
      }
    } catch {}
  }

  return NextResponse.json({ artworks: parsed, total, limit, offset });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    if (user.role !== "artist" && user.role !== "admin") {
      return NextResponse.json({ error: "Seuls les artistes peuvent deposer des oeuvres" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, technique, dimensions, creation_date, category, price, photos } = body;

    if (!title || !price) {
      return NextResponse.json({ error: "Titre et prix requis" }, { status: 400 });
    }

    const sb = getDb();
    const now = new Date().toISOString();
    const medium = body.medium || technique || "";
    const imageUrl = (photos && photos.length > 0) ? photos[0] : "";

    const { data: inserted, error: insertError } = await sb.from("artworks").insert({
      title,
      artist_id: user.id,
      owner_id: user.id,
      description: description || "",
      medium,
      year: creation_date ? parseInt(creation_date) : new Date().getFullYear(),
      category: category || "painting",
      additional_images: photos || [],
      image_url: imageUrl,
      status: "listed",
      price: parseFloat(price) || 0,
      is_public: true,
      is_for_sale: true,
      listed_at: now,
    }).select("id").single();

    if (insertError) {
      console.error("Artwork insert error:", insertError);
      return NextResponse.json({ error: "Erreur lors du depot: " + insertError.message }, { status: 500 });
    }

    return NextResponse.json({ id: inserted?.id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
