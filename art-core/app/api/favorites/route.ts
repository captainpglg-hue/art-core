import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, query, queryOne, queryAll } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const favorites = await queryAll(
    `SELECT f.*, a.title, a.price, a.photos, a.gauge_points, a.gauge_locked, a.status,
      u.name as artist_name
     FROM favorites f
     JOIN artworks a ON f.artwork_id = a.id
     JOIN users u ON a.artist_id = u.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [user.id]
  ) as any[];

  const parsed = favorites.map((f) => ({ ...f, photos: JSON.parse(f.photos || "[]") }));
  return NextResponse.json({ favorites: parsed });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const existing = await queryOne("SELECT id FROM favorites WHERE user_id = ? AND artwork_id = ?", [user.id, artwork_id]);

    if (existing) {
      await query("DELETE FROM favorites WHERE user_id = ? AND artwork_id = ?", [user.id, artwork_id]);
      await query("UPDATE artworks SET favorites_count = MAX(0, favorites_count - 1) WHERE id = ?", [artwork_id]);
      return NextResponse.json({ favorited: false });
    } else {
      const id = `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await query("INSERT INTO favorites (id, user_id, artwork_id) VALUES (?, ?, ?)", [id, user.id, artwork_id]);
      await query("UPDATE artworks SET favorites_count = favorites_count + 1 WHERE id = ?", [artwork_id]);
      return NextResponse.json({ favorited: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
