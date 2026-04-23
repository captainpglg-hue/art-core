import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, queryOne, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user: any = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { market_id, position, amount } = await req.json();
    if (!market_id || !position || !amount) {
      return NextResponse.json({ error: "market_id, position et amount requis" }, { status: 400 });
    }

    const market: any = await queryOne("SELECT * FROM betting_markets WHERE id = ?", [market_id]);
    if (!market) return NextResponse.json({ error: "Marché non trouvé" }, { status: 404 });
    if (market.status !== "open") return NextResponse.json({ error: "Marché fermé" }, { status: 400 });

    if (Number(user.points_balance) < Number(amount)) {
      return NextResponse.json({ error: "Points insuffisants" }, { status: 400 });
    }

    // Update totals — on ne peut pas faire `col = col + ?` via le translator REST,
    // donc on lit + réécrit la nouvelle valeur.
    const newYes = Number(market.total_yes_amount) + (position === "yes" ? Number(amount) : 0);
    const newNo = Number(market.total_no_amount) + (position === "no" ? Number(amount) : 0);
    await query("UPDATE betting_markets SET total_yes_amount = ?, total_no_amount = ? WHERE id = ?", [newYes, newNo, market_id]);

    // Recalculate odds
    const total = newYes + newNo;
    const oddsYes = Math.max(1.01, total / Math.max(newYes, 0.01));
    const oddsNo = Math.max(1.01, total / Math.max(newNo, 0.01));
    const oddsYesR = Math.round(oddsYes * 100) / 100;
    const oddsNoR = Math.round(oddsNo * 100) / 100;
    await query("UPDATE betting_markets SET odds_yes = ?, odds_no = ? WHERE id = ?", [oddsYesR, oddsNoR, market_id]);

    const odds = position === "yes" ? oddsYes : oddsNo;
    const potentialPayout = Math.round(Number(amount) * odds * 100) / 100;

    // Note : en Supabase, bets.id est un UUID généré par défaut (gen_random_uuid())
    // donc on ne fournit pas d'id manuel. L'ancien `bet_${Date.now()}_...`
    // n'aurait pas tenu dans une colonne uuid de toute façon.
    const betInsert: any = await queryOne<any>(
      "INSERT INTO bets (market_id, user_id, position, amount, odds_at_bet, potential_payout, result) VALUES (?, ?, ?, ?, ?, ?, 'pending') RETURNING id",
      [market_id, user.id, position, Number(amount), Math.round(odds * 100) / 100, potentialPayout],
    );
    const betId = betInsert?.id;

    await query("UPDATE users SET points_balance = ? WHERE id = ?", [Number(user.points_balance) - Number(amount), user.id]);

    await query(
      "INSERT INTO point_transactions (user_id, amount, type, reference_id, description) VALUES (?, ?, 'bet_place', ?, ?)",
      [user.id, -Number(amount), String(betId ?? ""), `Pari: ${market.question}`],
    );

    return NextResponse.json({
      betId,
      odds: Math.round(odds * 100) / 100,
      potentialPayout,
      new_balance: Number(user.points_balance) - Number(amount),
    });
  } catch (error: any) {
    console.error("[api/bet] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
