import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, query, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    // TODO: confirmSale is a complex transaction that needs refactoring for async
    // For now, inline simplified logic
    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [artwork_id]) as any;
    if (!artwork) throw new Error("Artwork not found");
    if (artwork.status === "sold") throw new Error("Artwork already sold");
    if (artwork.artist_id !== user.id && user.role !== "admin") throw new Error("Not authorized");

    const soldAt = new Date().toISOString();
    await query(
      "UPDATE artworks SET status = ?, sold_at = ?, updated_at = NOW() WHERE id = ?",
      ["sold", soldAt, artwork_id]
    );

    const txn_id = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await query(
      "INSERT INTO transactions (id, artwork_id, seller_id, status) VALUES (?, ?, ?, 'completed')",
      [txn_id, artwork_id, user.id]
    );

    return NextResponse.json({ success: true, sale_completed: true, sold_at: soldAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
