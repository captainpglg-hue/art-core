import { NextRequest, NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

// GET: export all data as JSON (admin only)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getAdminSession needs async conversion
  // const user = await getAdminSessionAsync(token);
  // if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const type = new URL(req.url).searchParams.get("type") || "all";

  const users = await queryAll(
    `SELECT u.id, u.email, u.name, u.username, u.role, u.points_balance, u.total_earned, u.is_initie, u.created_at,
            (SELECT COUNT(*) FROM artworks WHERE artist_id = u.id) as artworks_count
     FROM users u ORDER BY u.created_at DESC`,
    []
  );

  const artworks = await queryAll(
    `SELECT a.id, a.title, a.description, a.technique, a.dimensions, a.category, a.status, a.price,
            a.gauge_points, a.views_count, a.favorites_count, a.blockchain_hash, a.certification_date,
            a.created_at, a.listed_at, a.sold_at,
            u.name as artist_name, u.email as artist_email
     FROM artworks a JOIN users u ON a.artist_id = u.id
     ORDER BY a.created_at DESC`,
    []
  );

  const transactions = await queryAll(
    `SELECT t.*,
            b.name as buyer_name, s.name as seller_name, a.title as artwork_title
     FROM transactions t
     JOIN users b ON t.buyer_id = b.id
     JOIN users s ON t.seller_id = s.id
     JOIN artworks a ON t.artwork_id = a.id
     ORDER BY t.created_at DESC`,
    []
  );

  if (type === "users") return NextResponse.json({ users });
  if (type === "artworks") return NextResponse.json({ artworks });
  if (type === "transactions") return NextResponse.json({ transactions });

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    stats: { users: users.length, artworks: artworks.length, transactions: transactions.length },
    users,
    artworks,
    transactions,
  });
}
