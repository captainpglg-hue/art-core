import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

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
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const body = await req.json();
  const targetUser = await queryOne("SELECT id FROM users WHERE id = ?", [params.id]);
  if (!targetUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: any[] = [];

  // Frontend envoie parfois `name`, parfois `full_name` — on accepte les deux.
  const fullName = body.full_name ?? body.name;
  if (fullName !== undefined) {
    updates.push("full_name = ?");
    values.push(fullName);
  }
  if (body.email !== undefined) {
    updates.push("email = ?");
    values.push(body.email);
  }
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Role invalide" }, { status: 400 });
    }
    updates.push("role = ?");
    values.push(body.role);
  }
  if (body.points_balance !== undefined) {
    updates.push("points_balance = ?");
    values.push(body.points_balance);
  }
  if (body.is_initie !== undefined) {
    // Colonne booleenne en base.
    updates.push("is_initie = ?");
    values.push(Boolean(body.is_initie));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  updates.push("updated_at = NOW()");
  values.push(params.id);

  await query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ success: true, message: "Utilisateur mis à jour" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  if (params.id === guard.user.id) {
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
