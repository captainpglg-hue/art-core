import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getAdminSession(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const db = getDb();
  const certifications = db.prepare(`
    SELECT
      a.id, a.title, a.artist_id, a.blockchain_hash, a.blockchain_tx_id,
      a.certification_date, a.status, a.category,
      u.name as artist_name, u.email as artist_email
    FROM artworks a
    JOIN users u ON a.artist_id = u.id
    WHERE a.blockchain_hash IS NOT NULL
    ORDER BY a.certification_date DESC
  `).all();

  return NextResponse.json({ certifications });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getAdminSession(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { artwork_id, action } = await req.json();
  if (!artwork_id || !action) {
    return NextResponse.json({ error: "artwork_id et action requis" }, { status: 400 });
  }

  if (!["approve", "revoke"].includes(action)) {
    return NextResponse.json({ error: "Action invalide (approve/revoke)" }, { status: 400 });
  }

  const db = getDb();

  if (action === "revoke") {
    // Revoke certification
    db.prepare(`
      UPDATE artworks
      SET blockchain_hash = NULL, blockchain_tx_id = NULL, certification_date = NULL, status = 'pending_sale'
      WHERE id = ?
    `).run(artwork_id);
    return NextResponse.json({ success: true, message: "Certification revoquée" });
  }

  if (action === "approve") {
    // Approve certification (update status to certified if needed)
    db.prepare(`
      UPDATE artworks
      SET status = 'certified'
      WHERE id = ? AND blockchain_hash IS NOT NULL
    `).run(artwork_id);
    return NextResponse.json({ success: true, message: "Certification approuvée" });
  }

  return NextResponse.json({ success: true });
}
