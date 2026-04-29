import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getUserByToken, query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    if (user.is_initie) {
      return NextResponse.json({ error: "Vous êtes déjà initié" }, { status: 400 });
    }

    await query("UPDATE users SET is_initie = 1, bank_partner_connected = 1, points_balance = points_balance + 15 WHERE id = ?", [user.id]);

    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await query(
      "INSERT INTO point_transactions (id, user_id, amount, type, description) VALUES (?, ?, 15, 'signup_bonus', 'Bonus de bienvenue initié — Compte bancaire partenaire')",
      [ptId, user.id]
    );

    const nId = crypto.randomUUID();
    await query(
      "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'initie', 'Bienvenue Initié !', 'Vous avez reçu 15 points de bienvenue. Commencez à investir sur les oeuvres !', '/art-core/wallet')",
      [nId, user.id]
    );

    return NextResponse.json({ success: true, points_balance: user.points_balance + 15 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
