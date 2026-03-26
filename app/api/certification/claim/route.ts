import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

// POST: claim an artwork created anonymously during certification tunnel
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const sb = getDb();

    // Verify artwork exists and belongs to demo user
    const { data: artwork, error } = await sb
      .from("artworks")
      .select("id, title, artist_id, owner_id")
      .eq("id", artwork_id)
      .single();

    if (error || !artwork) {
      return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });
    }

    const DEMO_ID = "00000000-0000-0000-0000-000000000001";

    // Only allow claiming demo/anonymous artworks
    if (artwork.artist_id !== DEMO_ID && artwork.artist_id !== user.id) {
      return NextResponse.json({ error: "Cette oeuvre appartient deja a un autre artiste" }, { status: 403 });
    }

    // Transfer ownership to real user
    await sb.from("artworks").update({
      artist_id: user.id,
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", artwork_id);

    // Update notification to point to real user
    await sb.from("notifications").update({
      user_id: user.id,
    }).eq("link", `/art-core/oeuvre/${artwork_id}`).eq("user_id", DEMO_ID);

    return NextResponse.json({ success: true, artwork_id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
