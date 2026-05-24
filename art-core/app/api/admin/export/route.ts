import { NextRequest, NextResponse } from "next/server";
import { queryAll } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

async function safe<T>(sql: string): Promise<T[]> {
  try {
    return await queryAll<T>(sql, []);
  } catch (err) {
    console.error(`[admin/export] failed: ${sql.slice(0, 60)}...`, err);
    return [];
  }
}

// GET: export all data as JSON (admin only)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const type = new URL(req.url).searchParams.get("type") || "all";

  const usersSql = `SELECT u.id, u.email, u.full_name as name, u.username, u.role,
                           u.points_balance, u.total_earned, u.is_initie, u.created_at,
                           (SELECT COUNT(*) FROM artworks WHERE artist_id = u.id) as artworks_count
                    FROM users u ORDER BY u.created_at DESC`;

  const artworksSql = `SELECT a.id, a.title, a.description, a.technique, a.dimensions, a.category, a.status, a.price,
                              a.gauge_points, a.views_count, a.favorites_count, a.blockchain_hash, a.certification_date,
                              a.created_at, a.listed_at, a.sold_at,
                              u.full_name as artist_name, u.email as artist_email
                       FROM artworks a JOIN users u ON a.artist_id = u.id
                       ORDER BY a.created_at DESC`;

  const transactionsSql = `SELECT t.*,
                                  b.full_name as buyer_name, s.full_name as seller_name, a.title as artwork_title
                           FROM transactions t
                           JOIN users b ON t.buyer_id = b.id
                           JOIN users s ON t.seller_id = s.id
                           JOIN artworks a ON t.artwork_id = a.id
                           ORDER BY t.created_at DESC`;

  if (type === "users") return NextResponse.json({ users: await safe(usersSql) });
  if (type === "artworks") return NextResponse.json({ artworks: await safe(artworksSql) });
  if (type === "transactions") return NextResponse.json({ transactions: await safe(transactionsSql) });

  const [users, artworks, transactions] = await Promise.all([
    safe(usersSql),
    safe(artworksSql),
    safe(transactionsSql),
  ]);

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    stats: { users: users.length, artworks: artworks.length, transactions: transactions.length },
    users,
    artworks,
    transactions,
  });
}
