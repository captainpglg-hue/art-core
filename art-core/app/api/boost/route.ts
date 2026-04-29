import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getUserByToken, query, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const BOOST_COST = 1; // 1 point per boost

    if (user.points_balance < BOOST_COST) {
      return NextResponse.json({ error: "Points insuffisants (1 pt requis)" }, { status: 400 });
    }

    // Check if already boosted
    const existing = await queryOne("SELECT id FROM community_boosts WHERE user_id = ? AND artwork_id = ?", [user.id, artwork_id]);
    if (existing) {
      return NextResponse.json({ error: "Vous avez déjà boosté cette oeuvre" }, { status: 400 });
    }

    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [artwork_id]) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });

    // Deduct point and record boost
    await query("UPDATE users SET points_balance = points_balance - ? WHERE id = ?", [BOOST_COST, user.id]);

    const boostId = `boost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await query("INSERT INTO community_boosts (id, user_id, artwork_id, points_spent) VALUES (?, ?, ?, ?)", [boostId, user.id, artwork_id, BOOST_COST]);

    const newCount = (artwork.community_boosts || 0) + 1;
    const autoHighlight = newCount >= 50 ? 1 : 0;
    await query("UPDATE artworks SET community_boosts = ?, community_highlighted = ? WHERE id = ?", [newCount, autoHighlight, artwork_id]);

    // Point transaction
    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await query(
      "INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'community_boost', ?, ?)",
      [ptId, user.id, -BOOST_COST, boostId, `Boost communautaire: ${artwork.title}`]
    );

    // Reward artist with +5 pts every 10 boosts
    if (newCount % 10 === 0) {
      await query("UPDATE users SET points_balance = points_balance + 5, total_earned = total_earned + 5 WHERE id = ?", [artwork.artist_id]);
      const ptArtist = `pt_${Date.now()}_artist`;
      await query(
        "INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, 5, 'boost_reward', ?, ?)",
        [ptArtist, artwork.artist_id, artwork_id, `+5 pts: ${newCount} boosts sur "${artwork.title}"`]
      );
    }

    // Notify artist at milestones
    if ([10, 25, 50, 100].includes(newCount)) {
      const nId = crypto.randomUUID();
      const msg = newCount >= 50
        ? `"${artwork.title}" a reçu ${newCount} boosts ! Mise en avant algorithmique activée.`
        : `"${artwork.title}" a reçu ${newCount} boosts communautaires !`;
      await query(
        "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'boost', 'Boost communautaire !', ?, ?)",
        [nId, artwork.artist_id, msg, `/art-core/oeuvre/${artwork_id}`]
      );
    }

    return NextResponse.json({
      boost_count: newCount,
      auto_highlighted: autoHighlight === 1,
      new_balance: user.points_balance - BOOST_COST,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const artworkId = new URL(req.url).searchParams.get("artwork_id");
  if (!artworkId) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

  const countRow = await queryOne("SELECT COUNT(*) as c FROM community_boosts WHERE artwork_id = ?", [artworkId]) as any;
  const count = countRow?.c || 0;

  const token = req.cookies.get("core_session")?.value;
  let userBoosted = false;
  if (token) {
    const user = await getUserByToken(token);
    if (user) {
      const boostRecord = await queryOne("SELECT id FROM community_boosts WHERE user_id = ? AND artwork_id = ?", [user.id, artworkId]);
      userBoosted = !!boostRecord;
    }
  }

  return NextResponse.json({ boost_count: count, user_boosted: userBoosted });
}
