import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryAll } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const totalUsersRow = await queryOne("SELECT COUNT(*) as count FROM users", []) as any;
  const totalUsers = totalUsersRow?.count || 0;

  const totalArtworksRow = await queryOne("SELECT COUNT(*) as count FROM artworks", []) as any;
  const totalArtworks = totalArtworksRow?.count || 0;

  const totalTransactionsRow = await queryOne("SELECT COUNT(*) as count FROM transactions", []) as any;
  const totalTransactions = totalTransactionsRow?.count || 0;

  const revenueRow = await queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions", []) as any;
  const revenue = revenueRow?.total || 0;

  const platformFeesRow = await queryOne("SELECT COALESCE(SUM(commission_platform), 0) as total FROM transactions", []) as any;
  const platformFees = platformFeesRow?.total || 0;

  const artworksByStatus = await queryAll(
    `SELECT status, COUNT(*) as count FROM artworks GROUP BY status ORDER BY count DESC`,
    []
  ) as any[];

  const usersByRole = await queryAll(
    `SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC`,
    []
  ) as any[];

  // users.full_name (la colonne `name` n'existe pas).
  const recentTransactions = await queryAll(
    `SELECT
      t.id, t.amount, t.created_at,
      a.title as artwork_title,
      b.full_name as buyer_name,
      s.full_name as seller_name
    FROM transactions t
    JOIN artworks a ON t.artwork_id = a.id
    JOIN users b ON t.buyer_id = b.id
    JOIN users s ON t.seller_id = s.id
    ORDER BY t.created_at DESC LIMIT 10`,
    []
  ) as any[];

  const totalCertificationsRow = await queryOne(
    "SELECT COUNT(*) as count FROM artworks WHERE blockchain_hash IS NOT NULL",
    []
  ) as any;
  const totalCertifications = totalCertificationsRow?.count || 0;

  const thisMonthCertificationsRow = await queryOne(
    `SELECT COUNT(*) as count FROM artworks
     WHERE blockchain_hash IS NOT NULL
     AND certification_date > NOW() - INTERVAL '1 month'`,
    []
  ) as any;
  const thisMonthCertifications = thisMonthCertificationsRow?.count || 0;

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
