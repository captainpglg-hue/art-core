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

    const users = db
      .prepare(
        `SELECT
           u.id, u.email, u.name, u.role, u.points_balance, u.created_at,
           COUNT(a.id) as artwork_count
         FROM users u
         LEFT JOIN artworks a ON u.id = a.artist_id
         GROUP BY u.id
         ORDER BY u.created_at DESC`
      )
      .all() as any[];

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_session")?.value;
    const coreToken = req.cookies.get("core_session")?.value;

    const user = getAdminUser(coreToken, adminToken);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    const db = getDb();
    const body = await req.json();
    const { user_id, role, points_balance, name } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id requis" }, { status: 400 });
    }

    const updates = [];
    const values = [];

    if (role !== undefined) {
      updates.push("role = ?");
      values.push(role);
    }

    if (points_balance !== undefined) {
      updates.push("points_balance = ?");
      values.push(points_balance);
    }

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Aucun champ à mettre à jour" },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(user_id);

    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);

    return NextResponse.json({ success: true, message: "Utilisateur mis à jour" });
  } catch (error: any) {
    console.error("Users PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
