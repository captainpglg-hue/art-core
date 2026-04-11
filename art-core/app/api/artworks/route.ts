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

  const artworks = getArtworks({ status, category, search, sort, limit, offset, artistId });
  const total = countArtworks({ status, category, search, artistId });

  const parsed = artworks.map((a) => ({
    ...a,
    photos: JSON.parse(a.photos || "[]"),
  }));

  return NextResponse.json({ artworks: parsed, total, limit, offset });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (user.role !== "artist" && user.role !== "admin") {
      return NextResponse.json({ error: "Seuls les artistes peuvent déposer des oeuvres" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, technique, dimensions, creation_date, category, price, photos } = body;

    if (!title || !price) {
      return NextResponse.json({ error: "Titre et prix requis" }, { status: 400 });
    }

    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const photosJson = JSON.stringify(photos || []);

    getDb().prepare(
      `INSERT INTO artworks (id, title, artist_id, description, technique, dimensions, creation_date, category, photos, status, price, listed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'for_sale', ?, datetime('now'))`
    ).run(id, title, user.id, description || "", technique || "", dimensions || "", creation_date || "", category || "painting", photosJson, price);

    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
