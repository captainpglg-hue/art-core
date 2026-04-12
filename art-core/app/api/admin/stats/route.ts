import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getAdminSession(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const db = getDb();

  // Total counts
  const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
  const totalArtworks = (db.prepare("SELECT COUNT(*) as count FROM artworks").get() as any).count;
  const totalTransactions = (db.prepare("SELECT COUNT(*) as count FROM transactions").get() as any).count;

  // Revenue
  const revenue = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions").get() as any).total;
  const platformFees = (db.prepare("SELECT COALESCE(SUM(commission_platform), 0) as total FROM transactions").get() as any).total;

  // Artworks by status
  const artworksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM artworks
    GROUP BY status ORDER BY count DESC
  `).all() as any[];

  // Users by role
  const usersByRole = db.prepare(`
    SELECT role, COUNT(*) as count FROM users
    GROUP BY role ORDER BY count DESC
  `).all() as any[];

  // Recent transactions (last 10)
  const recentTransactions = db.prepare(`
    SELECT
      t.id, t.amount, t.created_at,
      a.title as artwork_title,
      b.name as buyer_name,
      s.name as seller_name
    FROM transactions t
    JOIN artworks a ON t.artwork_id = a.id
    JOIN users b ON t.buyer_id = b.id
    JOIN users s ON t.seller_id = s.id
    ORDER BY t.created_at DESC LIMIT 10
  `).all() as any[];

  // Certifications
  const totalCertifications = (db.prepare("SELECT COUNT(*) as count FROM artworks WHERE blockchain_hash IS NOT NULL").get() as any).count;
  const thisMonthCertifications = (db.prepare(`
    SELECT COUNT(*) as count FROM artworks
    WHERE blockchain_hash IS NOT NULL
    AND certification_date > datetime('now', '-1 month')
  `).get() as any).count;

  // Monthly revenue (last 6 months)
  const monthlyRevenue = db.prepare(`
    SELECT
      strftime('%Y-%m', t.created_at) as month,
      COALESCE(SUM(t.amount), 0) as revenue
    FROM transactions t
    WHERE t.created_at > datetime('now', '-6 months')
    GROUP BY strftime('%Y-%m', t.created_at)
    ORDER BY month ASC
  `).all() as any[];

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
