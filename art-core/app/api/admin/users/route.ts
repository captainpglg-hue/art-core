import { NextRequest, NextResponse } from "next/server";
import { queryAll, query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const users = await queryAll(
    `SELECT u.id, u.email, u.full_name as name, u.full_name, u.username, u.role,
            u.points_balance, u.total_earned, u.is_initie, u.created_at,
            (SELECT COUNT(*) FROM artworks WHERE artist_id = u.id) as artworks_count,
            (SELECT COUNT(*) FROM transactions WHERE buyer_id = u.id) as purchases_count
     FROM users u ORDER BY u.created_at DESC`,
    []
  );

  return NextResponse.json({ users });
}

const VALID_ROLES = [
  "artist",
  "client",
  "initiate",
  "admin",
  "galeriste",
  "antiquaire",
  "brocanteur",
  "depot_vente",
  "banned",
];

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const { user_id, role } = await req.json();
  if (!user_id || !role) {
    return NextResponse.json({ error: "user_id et role requis" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Role invalide" }, { status: 400 });
  }

  await query("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?", [role, user_id]);
  return NextResponse.json({ success: true });
}
