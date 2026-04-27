// =============================================================================
// POST /api/artworks/create
// Auth requise. Crée une œuvre. Si le user n'a pas encore de seller_profile,
// l'œuvre est marquée pending_seller_profile=true et n'est PAS publiée tant
// que le formulaire 2 (caractéristiques vendeur) n'est pas validé.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, getUserByToken } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });

    const {
      title, description, technique, dimensions, creation_date,
      category, price, photos, is_public,
    } = body;

    if (!title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });

    const photosArr: string[] = Array.isArray(photos)
      ? photos.filter((p: any) => typeof p === "string" && p.trim())
      : [];
    if (photosArr.length === 0) {
      return NextResponse.json({
        error: "Au moins une photo est obligatoire.",
        code: "PHOTO_REQUIRED",
      }, { status: 400 });
    }

    const userId = (user as any).id;
    const sb = getDb();

    // A-t-il déjà un seller_profile ?
    const { data: profile } = await sb
      .from("seller_profiles")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();

    const hasProfile = !!profile;

    const artworkId = crypto.randomUUID();
    const photosJson = JSON.stringify(photosArr);
    const image_url = photosArr[0] || null;
    const additional_images = photosArr.slice(1);
    const hashPayload = JSON.stringify({
      artwork_id: artworkId, title, artist_id: userId, photos: photosArr,
      certified_at: new Date().toISOString(),
    });
    const blockchainHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    const { error: artErr } = await sb.from("artworks").insert({
      id: artworkId,
      title,
      artist_id: userId,
      owner_id: userId,
      description: description || "",
      technique: technique || "",
      dimensions: dimensions || "",
      creation_date: creation_date || "",
      category: category || "painting",
      photos: photosJson,
      image_url,
      additional_images,
      status: "for_sale",
      price: Number(price) || 0,
      listed_at: new Date().toISOString(),
      is_public: hasProfile ? (is_public !== false) : false,
      is_for_sale: hasProfile,
      blockchain_hash: blockchainHash,
      certification_status: "pending",
      pending_seller_profile: !hasProfile,
    });
    if (artErr) {
      console.error("[artworks/create] insert failed:", artErr.message);
      return NextResponse.json({ error: `Insert œuvre : ${artErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      artwork_id: artworkId,
      pending_seller_profile: !hasProfile,
      next_step: hasProfile ? "published" : "seller_profile",
    });
  } catch (e: any) {
    console.error("[artworks/create] error:", e?.message);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
