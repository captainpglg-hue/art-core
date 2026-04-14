import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, queryAll } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const transactions = await queryAll(
    "SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    [user.id]
  );

  const commissions = await queryAll(
    `SELECT ic.*, a.title as artwork_title
     FROM initiate_commissions ic
     JOIN artworks a ON ic.artwork_id = a.id
     WHERE ic.initiate_id = ?
     ORDER BY ic.created_at DESC`,
    [user.id]
  );

  const gaugeInvestments = await queryAll(
    `SELECT ge.*, a.title as artwork_title, a.gauge_points, a.gauge_locked, a.status as artwork_status
     FROM gauge_entries ge
     JOIN artworks a ON ge.artwork_id = a.id
     WHERE ge.initiate_id = ?
     ORDER BY ge.created_at DESC`,
    [user.id]
  );

  return NextResponse.json({
    points_balance: user.points_balance,
    total_earned: user.total_earned,
    transactions,
    commissions,
    gaugeInvestments,
  });
}
