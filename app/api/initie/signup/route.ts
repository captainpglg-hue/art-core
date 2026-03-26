import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    if (user.is_initie) {
      return NextResponse.json({ error: "Vous etes deja initie" }, { status: 400 });
    }

    const sb = getDb();
    await sb.from("users").update({
      is_initie: true,
      bank_partner_connected: true,
      points_balance: Number(user.points_balance) + 15,
    }).eq("id", user.id);

    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sb.from("point_transactions").insert({
      id: ptId, user_id: user.id, amount: 15, type: "signup_bonus",
      description: "Bonus de bienvenue initie — Compte bancaire partenaire",
    });

    const nId = `notif_${Date.now()}`;
    await sb.from("notifications").insert({
      id: nId, user_id: user.id, type: "initie", title: "Bienvenue Initie !",
      message: "Vous avez recu 15 points de bienvenue. Commencez a investir sur les oeuvres !",
      link: "/art-core/wallet",
    });

    return NextResponse.json({ success: true, points_balance: Number(user.points_balance) + 15 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
