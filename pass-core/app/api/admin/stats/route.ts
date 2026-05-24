import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryAll } from "@/lib/db";

// Helper for admin auth - needs to be converted from getAdminSession
async function getAdminSessionAsync(_token: string) {
  // TODO: This needs proper async implementation
  // For now, we'd need to check the session table and verify admin role
  return null;
}

type CountRow = { count: number | string };
type SumRow = { total: number | string };

async function safeCount(sql: string): Promise<number> {
  try {
    const row = await queryOne<CountRow>(sql, []);
    return Number(row?.count ?? 0);
  } catch (err) {
    console.error(`[admin/stats] count failed: ${sql.slice(0, 60)}...`, err);
    return 0;
  }
}

async function safeSum(sql: string): Promise<number> {
  try {
    const row = await queryOne<SumRow>(sql, []);
    return Number(row?.total ?? 0);
  } catch (err) {
    console.error(`[admin/stats] sum failed: ${sql.slice(0, 60)}...`, err);
    return 0;
  }
}

async function safeRows<T>(sql: string): Promise<T[]> {
  try {
    return await queryAll<T>(sql, []);
  } catch (err) {
    console.error(`[admin/stats] rows failed: ${sql.slice(0, 60)}...`, err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getAdminSession needs async conversion
  const user = await getAdminSessionAsync(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const [
    totalUsers,
    totalArtworks,
    totalTransactions,
    totalRevenue,
    platformFees,
    artworksByStatus,
    usersByRole,
    recentTransactions,
    totalCertifications,
    thisMonthCertifications,
    monthlyRevenue,
  ] = await Promise.all([
    safeCount("SELECT COUNT(*) as count FROM users"),
    safeCount("SELECT COUNT(*) as count FROM artworks"),
    safeCount("SELECT COUNT(*) as count FROM transactions"),
    safeSum("SELECT COALESCE(SUM(amount), 0) as total FROM transactions"),
    safeSum("SELECT COALESCE(SUM(commission_platform), 0) as total FROM transactions"),
    safeRows<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM artworks GROUP BY status ORDER BY count DESC`
    ),
    safeRows<{ role: string; count: number }>(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC`
    ),
    safeRows<{ id: string; amount: number; created_at: string; artwork_title: string; buyer_name: string; seller_name: string }>(
      `SELECT
        t.id, t.amount, t.created_at,
        a.title as artwork_title,
        b.full_name as buyer_name,
        s.full_name as seller_name
      FROM transactions t
      JOIN artworks a ON t.artwork_id = a.id
      JOIN users b ON t.buyer_id = b.id
      JOIN users s ON t.seller_id = s.id
      ORDER BY t.created_at DESC LIMIT 10`
    ),
    safeCount("SELECT COUNT(*) as count FROM artworks WHERE blockchain_hash IS NOT NULL"),
    safeCount(
      `SELECT COUNT(*) as count FROM artworks
       WHERE blockchain_hash IS NOT NULL
       AND certification_date > NOW() - INTERVAL '1 month'`
    ),
    safeRows<{ month: string; revenue: number }>(
      `SELECT
        TO_CHAR(t.created_at, 'YYYY-MM') as month,
        COALESCE(SUM(t.amount), 0) as revenue
      FROM transactions t
      WHERE t.created_at > NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(t.created_at, 'YYYY-MM')
      ORDER BY month ASC`
    ),
  ]);

  return NextResponse.json({
    totalUsers,
    totalArtworks,
    totalTransactions,
    totalRevenue,
    platformFees,
    artworksByStatus,
    usersByRole,
    recentTransactions,
    certifications: {
      total: totalCertifications,
      thisMonth: thisMonthCertifications,
    },
    monthlyRevenue,
  });
}
