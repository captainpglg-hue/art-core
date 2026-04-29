import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query, queryOne, getUserByToken } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id, points } = await req.json();
    if (!artwork_id || !points || points <= 0) {
      return NextResponse.json({ error: "artwork_id et points requis" }, { status: 400 });
    }

    // TODO: depositGauge is a complex transaction that needs to be refactored for async
    // For now, inline the logic
    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [artwork_id]) as any;
    if (!artwork) throw new Error("Artwork not found");
    if (artwork.gauge_locked) throw new Error("Gauge is locked");
    if (artwork.status === "sold") throw new Error("Artwork already sold");

    const userRecord = await queryOne("SELECT * FROM users WHERE id = ?", [user.id]) as any;
    if (!userRecord || !userRecord.is_initie) throw new Error("User is not an initiate");
    if (userRecord.points_balance < points) throw new Error("Insufficient points");

    const newGauge = Math.min(artwork.gauge_points + points, 100);
    const actualPoints = newGauge - artwork.gauge_points;
    if (actualPoints <= 0) throw new Error("Gauge is full");

    const gId = `ge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await query("INSERT INTO gauge_entries (id, artwork_id, initiate_id, points) VALUES (?, ?, ?, ?)", [gId, artwork_id, user.id, actualPoints]);
    await query("UPDATE users SET points_balance = points_balance - ? WHERE id = ?", [actualPoints, user.id]);

    const locked = newGauge >= 100 ? 1 : 0;
    await query("UPDATE artworks SET gauge_points = ?, gauge_locked = ?, updated_at = NOW() WHERE id = ?", [newGauge, locked, artwork_id]);

    // Point transaction
    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await query("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'gauge_deposit', ?, ?)", [ptId, user.id, -actualPoints, gId, `Dépôt jauge: ${artwork.title}`]);

    if (locked) {
      // Notify artist
      const nId = crypto.randomUUID();
      await query("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'gauge_locked', 'Jauge verrouillée !', ?, ?)", [nId, artwork.artist_id, `La jauge de "${artwork.title}" a atteint 100 points ! Vente garantie.`, `/art-core/oeuvre/${artwork_id}`]);
    }

    return NextResponse.json({ gauge_points: newGauge, gauge_locked: locked, points_deposited: actualPoints });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
