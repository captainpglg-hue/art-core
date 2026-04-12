import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_session")?.value;
    const coreToken = req.cookies.get("core_session")?.value;

    const user = getAdminUser(coreToken, adminToken);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    const db = getDb();

    // Total certifications (with blockchain_hash)
    const totalCertifications = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM artworks WHERE blockchain_hash IS NOT NULL`
        )
        .get() as any
    ).count;

    // Total users
    const totalUsers = (
      db.prepare(`SELECT COUNT(*) as count FROM users`).get() as any
    ).count;

    // Certifications this month
    const certificationsThisMonth = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM artworks
           WHERE blockchain_hash IS NOT NULL
           AND strftime('%Y-%m', certification_date) = strftime('%Y-%m', 'now')`
        )
        .get() as any
    ).count;

    // Blockchain anchored (not simulated)
    const blockchainAnchored = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM artworks
           WHERE blockchain_hash IS NOT NULL
           AND (blockchain_tx_id IS NULL OR blockchain_tx_id NOT LIKE 'sim_%')`
        )
        .get() as any
    ).count;

    // Recent certifications (last 10)
    const recentCertifications = db
      .prepare(
        `SELECT a.id, a.title, a.blockchain_hash, a.blockchain_tx_id, a.certification_date, u.name as artist_name
         FROM artworks a
         JOIN users u ON a.artist_id = u.id
         WHERE a.blockchain_hash IS NOT NULL
         ORDER BY a.certification_date DESC
         LIMIT 10`
      )
      .all() as any[];

    // Monthly certifications (last 6 months)
    const monthlyCertifications = db
      .prepare(
        `SELECT
           strftime('%Y-%m', certification_date) as month_key,
           COUNT(*) as count
         FROM artworks
         WHERE blockchain_hash IS NOT NULL
         AND certification_date >= date('now', '-6 months')
         GROUP BY strftime('%Y-%m', certification_date)
         ORDER BY month_key DESC`
      )
      .all() as any[];

    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Jun",
      "Jul",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];

    const formattedMonthly = monthlyCertifications.map((item: any) => {
      const [year, month] = item.month_key.split("-");
      const monthIndex = parseInt(month) - 1;
      return {
        month: `${monthNames[monthIndex]} ${year}`,
        count: item.count,
      };
    });

    // Artworks by status
    const artworksByStatus = db
      .prepare(
        `SELECT status, COUNT(*) as count FROM artworks
         WHERE blockchain_hash IS NOT NULL
         GROUP BY status`
      )
      .all() as any[];

    // Users by role
    const usersByRole = db
      .prepare(
        `SELECT role, COUNT(*) as count FROM users GROUP BY role`
      )
      .all() as any[];

    return NextResponse.json({
      totalCertifications,
      totalUsers,
      certificationsThisMonth,
      blockchainAnchored,
      recentCertifications,
      monthlyCertifications: formattedMonthly,
      artworksByStatus,
      usersByRole,
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
