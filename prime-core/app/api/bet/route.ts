import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { market_id, position, amount } = await req.json();
    if (!market_id || !position || !amount) {
      return NextResponse.json({ error: "market_id, position et amount requis" }, { status: 400 });
    }

    const db = getDb();
    const market = db.prepare("SELECT * FROM betting_markets WHERE id = ?").get(market_id) as any;
    if (!market) return NextResponse.json({ error: "Marché non trouvé" }, { status: 404 });
    if (market.status !== "open") return NextResponse.json({ error: "Marché fermé" }, { status: 400 });

    if (user.points_balance < amount) {
      return NextResponse.json({ error: "Points insuffisants" }, { status: 400 });
    }

    // Update totals
    const col = position === "yes" ? "total_yes_amount" : "total_no_amount";
    db.prepare(`UPDATE betting_markets SET ${col} = ${col} + ? WHERE id = ?`).run(amount, market_id);

    // Recalculate odds
    const updated = db.prepare("SELECT * FROM betting_markets WHERE id = ?").get(market_id) as any;
    const total = updated.total_yes_amount + updated.total_no_amount;
    const oddsYes = Math.max(1.01, total / Math.max(updated.total_yes_amount, 0.01));
    const oddsNo = Math.max(1.01, total / Math.max(updated.total_no_amount, 0.01));
    db.prepare("UPDATE betting_markets SET odds_yes = ?, odds_no = ? WHERE id = ?").run(
      Math.round(oddsYes * 100) / 100, Math.round(oddsNo * 100) / 100, market_id
    );

    const odds = position === "yes" ? oddsYes : oddsNo;
    const potentialPayout = Math.round(amount * odds * 100) / 100;

    const betId = `bet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(
      "INSERT INTO bets (id, market_id, user_id, position, amount, odds_at_bet, potential_payout, result) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')"
    ).run(betId, market_id, user.id, position, amount, Math.round(odds * 100) / 100, potentialPayout);

    db.prepare("UPDATE users SET points_balance = points_balance - ? WHERE id = ?").run(amount, user.id);

    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(
      "INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'bet_place', ?, ?)"
    ).run(ptId, user.id, -amount, betId, `Pari: ${market.question}`);

    return NextResponse.json({
      betId,
      odds: Math.round(odds * 100) / 100,
      potentialPayout,
      new_balance: user.points_balance - amount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
