import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const sb = getDb();

  const { data: transactions } = await sb
    .from("point_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: commissionsRaw } = await sb
    .from("initiate_commissions")
    .select("*, artwork:artworks!initiate_commissions_artwork_id_fkey(title)")
    .eq("initiate_id", user.id)
    .order("created_at", { ascending: false });

  const commissions = (commissionsRaw || []).map((c: any) => ({
    ...c,
    artwork_title: c.artwork?.title,
    artwork: undefined,
  }));

  const { data: gaugeRaw } = await sb
    .from("gauge_entries")
    .select("*, artwork:artworks!gauge_entries_artwork_id_fkey(title, gauge_points, gauge_locked, status)")
    .eq("initiate_id", user.id)
    .order("created_at", { ascending: false });

  const gaugeInvestments = (gaugeRaw || []).map((g: any) => ({
    ...g,
    artwork_title: g.artwork?.title,
    gauge_points: g.artwork?.gauge_points,
    gauge_locked: g.artwork?.gauge_locked,
    artwork_status: g.artwork?.status,
    artwork: undefined,
  }));

  return NextResponse.json({
    points_balance: user.points_balance,
    total_earned: user.total_earned,
    transactions: transactions || [],
    commissions,
    gaugeInvestments,
  });
}
