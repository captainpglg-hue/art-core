import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_session")?.value;
    const coreToken = req.cookies.get("core_session")?.value;

    const user = getAdminUser(coreToken, adminToken);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    const db = getDb();

    const certifications = db
      .prepare(
        `SELECT a.id, a.title, a.blockchain_hash, a.blockchain_tx_id,
                a.macro_quality_score, a.certification_date, a.status, a.created_at,
                u.name as artist_name
         FROM artworks a
         JOIN users u ON a.artist_id = u.id
         WHERE a.blockchain_hash IS NOT NULL
         ORDER BY a.certification_date DESC`
      )
      .all() as any[];

    return NextResponse.json(certifications);
  } catch (error: any) {
    console.error("Certifications GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_session")?.value;
    const coreToken = req.cookies.get("core_session")?.value;

    const user = getAdminUser(coreToken, adminToken);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    const db = getDb();
    const body = await req.json();
    const { artwork_id, action, status } = body;

    if (!artwork_id || !action) {
      return NextResponse.json(
        { error: "artwork_id et action requis" },
        { status: 400 }
      );
    }

    if (action === "revoke") {
      // Revoke: set blockchain_hash to null
      db.prepare(`UPDATE artworks SET blockchain_hash = NULL, blockchain_tx_id = NULL WHERE id = ?`).run(
        artwork_id
      );
      return NextResponse.json({ success: true, message: "Certification révoquée" });
    } else if (action === "update_status") {
      if (!status) {
        return NextResponse.json(
          { error: "status requis pour update_status" },
          { status: 400 }
        );
      }
      db.prepare(`UPDATE artworks SET status = ? WHERE id = ?`).run(status, artwork_id);
      return NextResponse.json({ success: true, message: "Statut mis à jour" });
    } else {
      return NextResponse.json(
        { error: "Action invalide" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Certifications PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
