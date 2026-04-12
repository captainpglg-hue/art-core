import { NextRequest, NextResponse } from "next/server";
import { getArtworkById, getGaugeEntries, getDb, getUserByToken } from "@/lib/db";

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

// PATCH: admin can update artwork status, price, visibility
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const db = getDb();
    const artwork = db.prepare("SELECT * FROM artworks WHERE id = ?").get(id) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });

    const updates: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined) { updates.push("status = ?"); values.push(body.status); }
    if (body.price !== undefined) { updates.push("price = ?"); values.push(body.price); }
    if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
    if (body.category !== undefined) { updates.push("category = ?"); values.push(body.category); }
    if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }

    if (updates.length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE artworks SET ${updates.join(", ")} WHERE id = ?`).run(...values);

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
    const user = getUserByToken(token);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { id } = await params;
    const db = getDb();
    const artwork = db.prepare("SELECT * FROM artworks WHERE id = ?").get(id) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });

    // Delete related data first
    db.prepare("DELETE FROM gauge_entries WHERE artwork_id = ?").run(id);
    db.prepare("DELETE FROM offers WHERE artwork_id = ?").run(id);
    db.prepare("DELETE FROM favorites WHERE artwork_id = ?").run(id);
    db.prepare("DELETE FROM betting_markets WHERE artwork_id = ?").run(id);
    db.prepare("DELETE FROM bets WHERE market_id IN (SELECT id FROM betting_markets WHERE artwork_id = ?)").run(id);
    db.prepare("DELETE FROM artworks WHERE id = ?").run(id);

    return NextResponse.json({ success: true, deleted: id, title: artwork.title });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
