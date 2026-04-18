import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, query, queryAll } from "@/lib/db";

async function getAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || req.cookies.get("core_session")?.value;
  if (!token) return null;
  const user = await getUserByToken(token);
  return user && (user as any).role === "admin" ? user : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAdmin(req);
    if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const artworks = await queryAll(
      `SELECT a.id, a.title, a.category, a.price, a.status,
              a.blockchain_hash, a.created_at, a.macro_photo,
              u.full_name as artist_name
       FROM artworks a
       JOIN users u ON a.artist_id = u.id
       ORDER BY a.created_at DESC`
    );
    return NextResponse.json(artworks);
  } catch (error: any) {
    console.error("Artworks GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAdmin(req);
    if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const body = await req.json();
    const { artwork_id, price, status } = body;
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const updates: string[] = [];
    const values: any[] = [];
    if (price !== undefined) { updates.push("price = ?"); values.push(price); }
    if (status !== undefined) { updates.push("status = ?"); values.push(status); }
    if (updates.length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
    }
    updates.push("updated_at = NOW()");
    values.push(artwork_id);

    await query(`UPDATE artworks SET ${updates.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true, message: "Œuvre mise à jour" });
  } catch (error: any) {
    console.error("Artworks PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAdmin(req);
    if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    await query(`DELETE FROM betting_markets WHERE artwork_id = ?`, [artwork_id]);
    await query(`DELETE FROM artworks WHERE id = ?`, [artwork_id]);
    return NextResponse.json({ success: true, message: "Œuvre supprimée" });
  } catch (error: any) {
    console.error("Artworks DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
