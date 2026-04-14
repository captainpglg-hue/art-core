import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryAll } from "@/lib/db";

// Helper for admin auth - needs to be converted from getAdminSession
async function getAdminSessionAsync(token: string) {
  // TODO: This needs proper async implementation
  // For now, we'd need to check the session table and verify admin role
  return null;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getAdminSession needs async conversion
  const user = await getAdminSessionAsync(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  // Total counts
  const totalUsersRow = await queryOne("SELECT COUNT(*) as count FROM users", []) as any;
  const totalUsers = totalUsersRow?.count || 0;

  const totalArtworksRow = await queryOne("SELECT COUNT(*) as count FROM artworks", []) as any;
  const totalArtworks = totalArtworksRow?.count || 0;

  const totalTransactionsRow = await queryOne("SELECT COUNT(*) as count FROM transactions", []) as any;
  const totalTransactions = totalTransactionsRow?.count || 0;

  // Revenue
  const revenueRow = await queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions", []) as any;
  const revenue = revenueRow?.total || 0;

  const platformFeesRow = await queryOne("SELECT COALESCE(SUM(commission_platform), 0) as total FROM transactions", []) as any;
  const platformFees = platformFeesRow?.total || 0;

  // Artworks by status
  const artworksByStatus = await queryAll(
    `SELECT status, COUNT(*) as count FROM artworks GROUP BY status ORDER BY count DESC`,
    []
  ) as any[];

  // Users by role
  const usersByRole = await queryAll(
    `SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC`,
    []
  ) as any[];

  // Recent transactions (last 10)
  const recentTransactions = await queryAll(
    `SELECT
      t.id, t.amount, t.created_at,
      a.title as artwork_title,
      b.name as buyer_name,
      s.name as seller_name
    FROM transactions t
    JOIN artworks a ON t.artwork_id = a.id
    JOIN users b ON t.buyer_id = b.id
    JOIN users s ON t.seller_id = s.id
    ORDER BY t.created_at DESC LIMIT 10`,
    []
  ) as any[];

  // Certifications
  const totalCertificationsRow = await queryOne("SELECT COUNT(*) as count FROM artworks WHERE blockchain_hash IS NOT NULL", []) as any;
  const totalCertifications = totalCertificationsRow?.count || 0;

  const thisMonthCertificationsRow = await queryOne(
    `SELECT COUNT(*) as count FROM artworks
     WHERE blockchain_hash IS NOT NULL
     AND certification_date > NOW() - INTERVAL '1 month'`,
    []
  ) as any;
  const thisMonthCertifications = thisMonthCertificationsRow?.count || 0;

  // Monthly revenue (last 6 months)
  const monthlyRevenue = await queryAll(
    `SELECT
      TO_CHAR(t.created_at, 'YYYY-MM') as month,
      COALESCE(SUM(t.amount), 0) as revenue
    FROM transactions t
    WHERE t.created_at > NOW() - INTERVAL '6 months'
    GROUP BY TO_CHAR(t.created_at, 'YYYY-MM')
    ORDER BY month ASC`,
    []
  ) as any[];

  return NextResponse.json({
    totalUsers,
    totalArtworks,
    totalTransactions,
    totalRevenue: revenue,
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
