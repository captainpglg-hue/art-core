import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryAll, getUserByToken, getDb } from "@/lib/db";
import { parsePhotos } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sb = getDb();

    // Artwork — pas de JOIN, le translator SQL→REST ne les gère pas.
    const { data: artwork, error: aErr } = await sb
      .from("artworks")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!artwork) {
      return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });
    }

    // Artiste (JOIN manuel)
    const { data: artist } = await sb
      .from("users")
      .select("full_name, username, avatar_url, bio")
      .eq("id", artwork.artist_id)
      .maybeSingle();

    // gauge_entries + initiate name (2 requêtes, merge JS)
    const { data: gaugeRaw } = await sb
      .from("gauge_entries")
      .select("*")
      .eq("artwork_id", id)
      .order("created_at", { ascending: false });
    const initiateIds = Array.from(new Set((gaugeRaw || []).map((g: any) => g.initiate_id).filter(Boolean)));
    let initiates: Record<string, any> = {};
    if (initiateIds.length) {
      const { data: users } = await sb
        .from("users")
        .select("id, full_name, username")
        .in("id", initiateIds);
      initiates = Object.fromEntries((users || []).map((u: any) => [u.id, u]));
    }
    const gaugeEntries = (gaugeRaw || []).map((g: any) => ({
      ...g,
      initiate_name: initiates[g.initiate_id]?.full_name || null,
      initiate_username: initiates[g.initiate_id]?.username || null,
    }));

    // offers + buyer name
    const { data: offersRaw } = await sb
      .from("offers")
      .select("*")
      .eq("artwork_id", id)
      .order("created_at", { ascending: false });
    const buyerIds = Array.from(new Set((offersRaw || []).map((o: any) => o.buyer_id).filter(Boolean)));
    let buyers: Record<string, any> = {};
    if (buyerIds.length) {
      const { data: users } = await sb
        .from("users")
        .select("id, full_name")
        .in("id", buyerIds);
      buyers = Object.fromEntries((users || []).map((u: any) => [u.id, u]));
    }
    const offers = (offersRaw || []).map((o: any) => ({
      ...o,
      buyer_name: buyers[o.buyer_id]?.full_name || null,
    }));

    // betting markets
    const { data: markets } = await sb
      .from("betting_markets")
      .select("*")
      .eq("artwork_id", id)
      .order("created_at", { ascending: false });

    // Photos peut être stocké en TEXT[] (nouveau) ou JSON string (ancien) — parsePhotos gère les deux.
    const photos = parsePhotos(artwork.photos);

    return NextResponse.json({
      artwork: {
        ...artwork,
        photos,
        artist_name: artist?.full_name || null,
        artist_username: artist?.username || null,
        artist_avatar: artist?.avatar_url || null,
        artist_bio: artist?.bio || null,
      },
      gaugeEntries,
      offers,
      markets: markets || [],
    });
  } catch (e: any) {
    console.error("[artworks/[id]] GET failed:", e?.message);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}

// PATCH: admin can update artwork status, price, visibility
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [id]) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });

    const updates: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined) { updates.push("status = ?"); values.push(body.status); }
    if (body.price !== undefined) { updates.push("price = ?"); values.push(body.price); }
    if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
    if (body.category !== undefined) { updates.push("category = ?"); values.push(body.category); }
    if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }

    if (updates.length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

    updates.push("updated_at = NOW()");
    values.push(id);
    await query(`UPDATE artworks SET ${updates.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ success: true, updated: Object.keys(body) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: admin can remove an artwork from the marketplace
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { id } = await params;
    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [id]) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvée" }, { status: 404 });

    // Delete related data first
    await query("DELETE FROM gauge_entries WHERE artwork_id = ?", [id]);
    await query("DELETE FROM offers WHERE artwork_id = ?", [id]);
    await query("DELETE FROM favorites WHERE artwork_id = ?", [id]);
    await query("DELETE FROM betting_markets WHERE artwork_id = ?", [id]);
    await query("DELETE FROM bets WHERE market_id IN (SELECT id FROM betting_markets WHERE artwork_id = ?)", [id]);
    await query("DELETE FROM artworks WHERE id = ?", [id]);

    return NextResponse.json({ success: true, deleted: id, title: artwork.title });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
