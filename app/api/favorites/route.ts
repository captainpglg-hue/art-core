import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const sb = getDb();
  const { data: favorites } = await sb
    .from("favorites")
    .select("*, artwork:artworks!favorites_artwork_id_fkey(title, price, photos, gauge_points, gauge_locked, status, artist:users!artworks_artist_id_fkey(full_name))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const parsed = (favorites || []).map((f: any) => ({
    ...f,
    title: f.artwork?.title,
    price: f.artwork?.price,
    photos: typeof f.artwork?.photos === "string" ? JSON.parse(f.artwork?.photos || "[]") : (f.artwork?.photos || []),
    gauge_points: f.artwork?.gauge_points,
    gauge_locked: f.artwork?.gauge_locked,
    status: f.artwork?.status,
    artist_name: f.artwork?.artist?.full_name,
    artwork: undefined,
  }));

  return NextResponse.json({ favorites: parsed });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const sb = getDb();
    const { data: existing } = await sb.from("favorites").select("id").eq("user_id", user.id).eq("artwork_id", artwork_id).single();

    if (existing) {
      await sb.from("favorites").delete().eq("user_id", user.id).eq("artwork_id", artwork_id);
      // Decrement favorites_count
      const { data: art } = await sb.from("artworks").select("favorites_count").eq("id", artwork_id).single();
      await sb.from("artworks").update({ favorites_count: Math.max(0, (art?.favorites_count || 0) - 1) }).eq("id", artwork_id);
      return NextResponse.json({ favorited: false });
    } else {
      const id = `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sb.from("favorites").insert({ id, user_id: user.id, artwork_id });
      const { data: art } = await sb.from("artworks").select("favorites_count").eq("id", artwork_id).single();
      await sb.from("artworks").update({ favorites_count: (art?.favorites_count || 0) + 1 }).eq("id", artwork_id);
      return NextResponse.json({ favorited: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
