import { NextRequest, NextResponse } from "next/server";
import { queryAll, query } from "@/lib/db";

async function getAdminSessionAsync(token: string) {
  // TODO: Needs proper async implementation
  return null;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getAdminSessionAsync(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const certifications = await queryAll(
    `SELECT
      a.id, a.title, a.artist_id, a.blockchain_hash, a.blockchain_tx_id,
      a.certification_date, a.status, a.category,
      u.name as artist_name, u.email as artist_email
    FROM artworks a
    JOIN users u ON a.artist_id = u.id
    WHERE a.blockchain_hash IS NOT NULL
    ORDER BY a.certification_date DESC`,
    []
  );

  return NextResponse.json({ certifications });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getAdminSessionAsync(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { artwork_id, action } = await req.json();
  if (!artwork_id || !action) {
    return NextResponse.json({ error: "artwork_id et action requis" }, { status: 400 });
  }

  if (!["approve", "revoke"].includes(action)) {
    return NextResponse.json({ error: "Action invalide (approve/revoke)" }, { status: 400 });
  }

  if (action === "revoke") {
    await query(
      `UPDATE artworks
       SET blockchain_hash = NULL, blockchain_tx_id = NULL, certification_date = NULL, status = 'pending_sale'
       WHERE id = ?`,
      [artwork_id]
    );
    return NextResponse.json({ success: true, message: "Certification revoquée" });
  }

  return NextResponse.json({ success: true });
}
