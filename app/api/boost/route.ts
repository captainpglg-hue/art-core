import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const sb = getDb();
    const BOOST_COST = 1; // 1 point per boost

    if (user.points_balance < BOOST_COST) {
      return NextResponse.json({ error: "Points insuffisants (1 pt requis)" }, { status: 400 });
    }

    // Check if already boosted
    const { data: existing } = await sb.from("community_boosts").select("id").eq("user_id", user.id).eq("artwork_id", artwork_id).single();
    if (existing) {
      return NextResponse.json({ error: "Vous avez deja booste cette oeuvre" }, { status: 400 });
    }

    const { data: artwork } = await sb.from("artworks").select("*").eq("id", artwork_id).single();
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });

    // Deduct point and record boost
    await sb.from("users").update({ points_balance: user.points_balance - BOOST_COST }).eq("id", user.id);

    const boostId = `boost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sb.from("community_boosts").insert({ id: boostId, user_id: user.id, artwork_id, points_spent: BOOST_COST });

    const newCount = (artwork.community_boosts || 0) + 1;
    const autoHighlight = newCount >= 50;
    await sb.from("artworks").update({ community_boosts: newCount, community_highlighted: autoHighlight ? 1 : 0 }).eq("id", artwork_id);

    // Point transaction
    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sb.from("point_transactions").insert({
      id: ptId, user_id: user.id, amount: -BOOST_COST, type: "community_boost",
      reference_id: boostId, description: `Boost communautaire: ${artwork.title}`,
    });

    // Reward artist with +5 pts every 10 boosts
    if (newCount % 10 === 0) {
      const { data: artist } = await sb.from("users").select("points_balance, total_earned").eq("id", artwork.artist_id).single();
      await sb.from("users").update({
        points_balance: Number(artist?.points_balance ?? 0) + 5,
        total_earned: Number(artist?.total_earned ?? 0) + 5,
      }).eq("id", artwork.artist_id);

      const ptArtist = `pt_${Date.now()}_artist`;
      await sb.from("point_transactions").insert({
        id: ptArtist, user_id: artwork.artist_id, amount: 5, type: "boost_reward",
        reference_id: artwork_id, description: `+5 pts: ${newCount} boosts sur "${artwork.title}"`,
      });
    }

    // Notify artist at milestones
    if ([10, 25, 50, 100].includes(newCount)) {
      const nId = `notif_${Date.now()}`;
      const msg = newCount >= 50
        ? `"${artwork.title}" a recu ${newCount} boosts ! Mise en avant algorithmique activee.`
        : `"${artwork.title}" a recu ${newCount} boosts communautaires !`;
      await sb.from("notifications").insert({
        id: nId, user_id: artwork.artist_id, type: "boost", title: "Boost communautaire !",
        message: msg, link: `/art-core/oeuvre/${artwork_id}`,
      });
    }

    return NextResponse.json({
      boost_count: newCount,
      auto_highlighted: autoHighlight,
      new_balance: user.points_balance - BOOST_COST,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const artworkId = new URL(req.url).searchParams.get("artwork_id");
  if (!artworkId) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

  const sb = getDb();
  const { count } = await sb.from("community_boosts").select("id", { count: "exact", head: true }).eq("artwork_id", artworkId);

  const token = req.cookies.get("core_session")?.value;
  let userBoosted = false;
  if (token) {
    const user = await getUserByToken(token);
    if (user) {
      const { data: boost } = await sb.from("community_boosts").select("id").eq("user_id", user.id).eq("artwork_id", artworkId).single();
      userBoosted = !!boost;
    }
  }

  return NextResponse.json({ boost_count: count || 0, user_boosted: userBoosted });
}
