import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_session")?.value;

    if (!adminToken) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const db = getDb();

    // Get session
    const session = db
      .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')")
      .get(adminToken) as any;

    if (!session) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // Get user
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
