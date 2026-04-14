import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryAll, getUserByToken } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = await queryOne(
    `SELECT a.*, u.name as artist_name, u.username as artist_username, u.avatar_url as artist_avatar, u.bio as artist_bio
     FROM artworks a JOIN users u ON a.artist_id = u.id WHERE a.id = ?`,
    [id]
  ) as any;

  if (!artwork) {
    return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });
  }

  const gaugeEntries = await queryAll(
    `SELECT ge.*, u.name as initiate_name, u.username as initiate_username
     FROM gauge_entries ge JOIN users u ON ge.initiate_id = u.id
     WHERE ge.artwork_id = ? ORDER BY ge.created_at DESC`,
    [id]
  ) as any[];

  const photos = JSON.parse(artwork.photos || "[]");

  // Get offers
  const offers = await queryAll(
    `SELECT o.*, u.name as buyer_name FROM offers o JOIN users u ON o.buyer_id = u.id
     WHERE o.artwork_id = ? ORDER BY o.created_at DESC`,
    [id]
  ) as any[];

  // Get betting markets
  const markets = await queryAll(
    "SELECT * FROM betting_markets WHERE artwork_id = ? ORDER BY created_at DESC",
    [id]
  ) as any[];

  return NextResponse.json({
    artwork: { ...artwork, photos },
    gaugeEntries,
    offers,
    markets,
  });
}

// PATCH: admin can update artwork status, price, visibility
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [id]) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });

    const updates: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined) { updates.push("status = ?"); values.push(body.status); }
    if (body.price !== undefined) { updates.push("price = ?"); values.push(body.price); }
    if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
    if (body.category !== undefined) { updates.push("category = ?"); values.push(body.category); }
    if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }

    if (updates.length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

    updates.push("updated_at = NOW()");
    values.push(id);
    await query(`UPDATE artworks SET ${updates.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ success: true, updated: Object.keys(body) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: admin can remove an artwork from the marketplace
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { id } = await params;
    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [id]) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });

    // Delete related data first
    await query("DELETE FROM gauge_entries WHERE artwork_id = ?", [id]);
    await query("DELETE FROM offers WHERE artwork_id = ?", [id]);
    await query("DELETE FROM favorites WHERE artwork_id = ?", [id]);
    await query("DELETE FROM betting_markets WHERE artwork_id = ?", [id]);
    await query("DELETE FROM bets WHERE market_id IN (SELECT id FROM betting_markets WHERE artwork_id = ?)", [id]);
    await query("DELETE FROM artworks WHERE id = ?", [id]);

    return NextResponse.json({ success: true, deleted: id, title: artwork.title });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
