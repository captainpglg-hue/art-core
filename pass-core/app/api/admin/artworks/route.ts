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

    const artworks = db
      .prepare(
        `SELECT
           a.id, a.title, a.category, a.price, a.status,
           a.blockchain_hash, a.created_at, a.macro_photo,
           u.name as artist_name
         FROM artworks a
         JOIN users u ON a.artist_id = u.id
         ORDER BY a.created_at DESC`
      )
      .all() as any[];

    return NextResponse.json(artworks);
  } catch (error: any) {
    console.error("Artworks GET error:", error);
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
    const { artwork_id, price, status } = body;

    if (!artwork_id) {
      return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });
    }

    const updates = [];
    const values = [];

    if (price !== undefined) {
      updates.push("price = ?");
      values.push(price);
    }

    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Aucun champ à mettre à jour" },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(artwork_id);

    const query = `UPDATE artworks SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);

    return NextResponse.json({ success: true, message: "Œuvre mise à jour" });
  } catch (error: any) {
    console.error("Artworks PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_session")?.value;
    const coreToken = req.cookies.get("core_session")?.value;

    const user = getAdminUser(coreToken, adminToken);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    const db = getDb();
    const body = await req.json();
    const { artwork_id } = body;

    if (!artwork_id) {
      return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });
    }

    // Delete related betting markets first
    db.prepare(`DELETE FROM betting_markets WHERE artwork_id = ?`).run(artwork_id);

    // Delete the artwork
    db.prepare(`DELETE FROM artworks WHERE id = ?`).run(artwork_id);

    return NextResponse.json({ success: true, message: "Œuvre supprimée" });
  } catch (error: any) {
    console.error("Artworks DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
