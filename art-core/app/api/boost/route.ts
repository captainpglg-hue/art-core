import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const db = getDb();
    const BOOST_COST = 1; // 1 point per boost

    if (user.points_balance < BOOST_COST) {
      return NextResponse.json({ error: "Points insuffisants (1 pt requis)" }, { status: 400 });
    }

    // Check if already boosted
    const existing = db.prepare("SELECT id FROM community_boosts WHERE user_id = ? AND artwork_id = ?").get(user.id, artwork_id);
    if (existing) {
      return NextResponse.json({ error: "Vous avez déjà boosté cette oeuvre" }, { status: 400 });
    }

    const artwork = db.prepare("SELECT * FROM artworks WHERE id = ?").get(artwork_id) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });

    // Deduct point and record boost
    db.prepare("UPDATE users SET points_balance = points_balance - ? WHERE id = ?").run(BOOST_COST, user.id);

    const boostId = `boost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare("INSERT INTO community_boosts (id, user_id, artwork_id, points_spent) VALUES (?, ?, ?, ?)").run(boostId, user.id, artwork_id, BOOST_COST);

    const newCount = (artwork.community_boosts || 0) + 1;
    const autoHighlight = newCount >= 50 ? 1 : 0;
    db.prepare("UPDATE artworks SET community_boosts = ?, community_highlighted = ? WHERE id = ?").run(newCount, autoHighlight, artwork_id);

    // Point transaction
    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'community_boost', ?, ?)")
      .run(ptId, user.id, -BOOST_COST, boostId, `Boost communautaire: ${artwork.title}`);

    // Reward artist with +5 pts every 10 boosts
    if (newCount % 10 === 0) {
      db.prepare("UPDATE users SET points_balance = points_balance + 5, total_earned = total_earned + 5 WHERE id = ?").run(artwork.artist_id);
      const ptArtist = `pt_${Date.now()}_artist`;
      db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, 5, 'boost_reward', ?, ?)")
        .run(ptArtist, artwork.artist_id, artwork_id, `+5 pts: ${newCount} boosts sur "${artwork.title}"`);
    }

    // Notify artist at milestones
    if ([10, 25, 50, 100].includes(newCount)) {
      const nId = `notif_${Date.now()}`;
      const msg = newCount >= 50
        ? `"${artwork.title}" a reçu ${newCount} boosts ! Mise en avant algorithmique activée.`
        : `"${artwork.title}" a reçu ${newCount} boosts communautaires !`;
      db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'boost', 'Boost communautaire !', ?, ?)")
        .run(nId, artwork.artist_id, msg, `/art-core/oeuvre/${artwork_id}`);
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

  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM community_boosts WHERE artwork_id = ?").get(artworkId) as any).c;

  const token = req.cookies.get("core_session")?.value;
  let userBoosted = false;
  if (token) {
    const user = getUserByToken(token);
    if (user) {
      userBoosted = !!db.prepare("SELECT id FROM community_boosts WHERE user_id = ? AND artwork_id = ?").get(user.id, artworkId);
    }
  }

  return NextResponse.json({ boost_count: count, user_boosted: userBoosted });
}
