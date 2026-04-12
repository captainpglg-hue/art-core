import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.username, u.role, u.points_balance, u.total_earned,
           u.is_initie, u.created_at,
           (SELECT COUNT(*) FROM artworks WHERE artist_id = u.id) as artworks_count,
           (SELECT COUNT(*) FROM transactions WHERE buyer_id = u.id) as purchases_count
    FROM users u ORDER BY u.created_at DESC
  `).all();

  return NextResponse.json({ users });
}

// PATCH: admin can update user role
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { user_id, role } = await req.json();
  if (!user_id || !role) return NextResponse.json({ error: "user_id et role requis" }, { status: 400 });

  const validRoles = ["artist", "initiate", "client", "admin"];
  if (!validRoles.includes(role)) return NextResponse.json({ error: "Role invalide" }, { status: 400 });

  getDb().prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, user_id);
  return NextResponse.json({ success: true });
}
