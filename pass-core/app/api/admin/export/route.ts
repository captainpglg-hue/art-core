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
    const type = req.nextUrl.searchParams.get("type") || "all";

    let exportData: any = {};

    if (type === "certifications" || type === "all") {
      const certifications = db
        .prepare(
          `SELECT a.*, u.name as artist_name
           FROM artworks a
           JOIN users u ON a.artist_id = u.id
           WHERE a.blockchain_hash IS NOT NULL
           ORDER BY a.certification_date DESC`
        )
        .all() as any[];
      exportData.certifications = certifications;
    }

    if (type === "users" || type === "all") {
      const users = db
        .prepare(
          `SELECT u.id, u.email, u.name, u.role, u.points_balance, u.total_earned, u.bio, u.avatar_url, u.created_at, u.updated_at,
                  COUNT(a.id) as artwork_count
           FROM users u
           LEFT JOIN artworks a ON u.id = a.artist_id
           GROUP BY u.id
           ORDER BY u.created_at DESC`
        )
        .all() as any[];
      exportData.users = users;
    }

    if (type === "artworks" || type === "all") {
      const artworks = db
        .prepare(
          `SELECT a.*, u.name as artist_name
           FROM artworks a
           JOIN users u ON a.artist_id = u.id
           ORDER BY a.created_at DESC`
        )
        .all() as any[];
      exportData.artworks = artworks;
    }

    if (type === "all") {
      const transactions = db
        .prepare(`SELECT * FROM transactions ORDER BY created_at DESC`)
        .all() as any[];
      exportData.transactions = transactions;

      const sessions = db
        .prepare(`SELECT id, user_id, expires_at FROM sessions`)
        .all() as any[];
      exportData.sessions = sessions;
    }

    const json = JSON.stringify(exportData, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="export_${type}_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
