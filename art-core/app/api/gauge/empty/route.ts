import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getUserByToken } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    // TODO: emptyGauge is a complex transaction that needs refactoring for async
    // For now, inline the logic
    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [artwork_id]) as any;
    if (!artwork) throw new Error("Artwork not found");
    if (!artwork.gauge_locked) throw new Error("Gauge is not locked");

    const entries = await queryOne(
      "SELECT GROUP_CONCAT(id, ',') as ids FROM gauge_entries WHERE artwork_id = ?",
      [artwork_id]
    ) as any;
    const entryIds = entries?.ids?.split(",") || [];

    if (entryIds.length > 0) {
      for (const entryId of entryIds) {
        const entry = await queryOne("SELECT * FROM gauge_entries WHERE id = ?", [entryId]) as any;
        if (entry) {
          await query("UPDATE users SET points_balance = points_balance + ? WHERE id = ?", [entry.points, entry.initiate_id]);
          const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await query("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'gauge_empty', ?, ?)", [ptId, entry.initiate_id, entry.points, entryId, `Annulation jauge: ${artwork.title}`]);
        }
      }
    }

    const now = new Date().toISOString();
    await query("DELETE FROM gauge_entries WHERE artwork_id = ?", [artwork_id]);
    await query("UPDATE artworks SET gauge_points = 0, gauge_locked = 0, gauge_emptied_at = ?, updated_at = NOW() WHERE id = ?", [now, artwork_id]);

    // Notify all initiates
    for (const entryId of entryIds) {
      const entry = await queryOne("SELECT initiate_id FROM gauge_entries WHERE id = ?", [entryId]) as any;
      if (entry) {
        const nId = `notif_${Date.now()}`;
        await query("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'gauge_empty', 'Jauge annulée', ?, ?)", [nId, entry.initiate_id, `La jauge de "${artwork.title}" a été annulée. Vos points sont remboursés.`, `/art-core/oeuvre/${artwork_id}`]);
      }
    }

    return NextResponse.json({ success: true, gauge_points: 0, gauge_locked: 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
