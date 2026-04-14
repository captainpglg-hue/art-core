import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";

// Helper for admin auth - needs to be converted from getAdminSession
async function getAdminSessionAsync(token: string) {
  // TODO: This needs proper async implementation
  // For now, we'd need to check the session table and verify admin role
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getAdminSession needs async conversion
  const user = await getAdminSessionAsync(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const targetUser = await queryOne(
    `SELECT
      u.*,
      (SELECT COUNT(*) FROM artworks WHERE artist_id = u.id) as artworks_count,
      (SELECT COUNT(*) FROM transactions WHERE buyer_id = u.id) as purchases_count,
      (SELECT COUNT(*) FROM transactions WHERE seller_id = u.id) as sales_count,
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE seller_id = u.id) as total_sales_amount
    FROM users u
    WHERE u.id = ?`,
    [params.id]
  );

  if (!targetUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  return NextResponse.json({ user: targetUser });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getAdminSession needs async conversion
  const user = await getAdminSessionAsync(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { name, email, role, points_balance, is_initie } = await req.json();

  const targetUser = await queryOne("SELECT id FROM users WHERE id = ?", [params.id]);

  if (!targetUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];

  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name);
  }
  if (email !== undefined) {
    updates.push("email = ?");
    values.push(email);
  }
  if (role !== undefined) {
    const validRoles = ["artist", "initiate", "client", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Role invalide" }, { status: 400 });
    }
    updates.push("role = ?");
    values.push(role);
  }
  if (points_balance !== undefined) {
    updates.push("points_balance = ?");
    values.push(points_balance);
  }
  if (is_initie !== undefined) {
    updates.push("is_initie = ?");
    values.push(is_initie ? 1 : 0);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  updates.push("updated_at = NOW()");
  values.push(params.id);

  const sqlQuery = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
  await query(sqlQuery, values);

  return NextResponse.json({ success: true, message: "Utilisateur mis à jour" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getAdminSession needs async conversion
  const user = await getAdminSessionAsync(token);
  if (!user) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  // Prevent admin from deleting themselves
  if (params.id === user.id) {
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 400 });
  }

  const targetUser = await queryOne("SELECT id FROM users WHERE id = ?", [params.id]);

  if (!targetUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  // Soft delete: set role to 'banned'
  await query("UPDATE users SET role = 'banned', updated_at = NOW() WHERE id = ?", [params.id]);

  return NextResponse.json({ success: true, message: "Utilisateur suspendu" });
}
