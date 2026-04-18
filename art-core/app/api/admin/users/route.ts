import { NextRequest, NextResponse } from "next/server";
import { queryAll, query } from "@/lib/db";

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

  const users = await queryAll(
    `SELECT u.id, u.email, u.full_name as name, u.username, u.role, u.points_balance, u.total_earned,
            u.is_initie, u.created_at,
            (SELECT COUNT(*) FROM artworks WHERE artist_id = u.id) as artworks_count,
            (SELECT COUNT(*) FROM transactions WHERE buyer_id = u.id) as purchases_count
     FROM users u ORDER BY u.created_at DESC`,
    []
  );

  return NextResponse.json({ users });
}

// PATCH: admin can update user role
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getAdminSession needs async conversion
  const user = await getAdminSessionAsync(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { user_id, role } = await req.json();
  if (!user_id || !role) return NextResponse.json({ error: "user_id et role requis" }, { status: 400 });

  const validRoles = ["artist", "initiate", "client", "admin"];
  if (!validRoles.includes(role)) return NextResponse.json({ error: "Role invalide" }, { status: 400 });

  await query("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?", [role, user_id]);
  return NextResponse.json({ success: true });
}
