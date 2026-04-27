// =============================================================================
// POST /api/artworks/create
// =============================================================================
// Auth requise. Cree une oeuvre AVEC identification visuelle (LBC §3) :
//   - Telecharge la photo macro fournie
//   - Calcule l'empreinte perceptuelle (aHash + dHash via lib/fingerprint)
//   - Verifie anti-double-certification : si similarite >= 99% avec une oeuvre
//     existante, bloque + alerte fraude (LBC §6.1)
//   - Genere le hash blockchain final lie a l'empreinte
//   - Si user n'a pas encore de seller_profile : oeuvre marquee
//     pending_seller_profile=true, n'est PAS publiee tant que le formulaire 2
//     (caracteristiques vendeur) n'est pas valide
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, getUserByToken } from "@/lib/db";
import { generateFingerprint, compareFingerprintsHamming } from "@/lib/fingerprint";

const DUPLICATE_THRESHOLD = 99;

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("download " + url + ": HTTP " + res.status);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

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
      category, price, photos, macro_photo, macro_position,
      macro_quality_score, geolocation, is_public,
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

    const macroUrl: string | null = typeof macro_photo === "string" && macro_photo.trim()
      ? macro_photo.trim()
      : null;
    if (!macroUrl) {
      return NextResponse.json({
        error: "La photo macro d'identification visuelle est obligatoire pour deposer une oeuvre certifiee.",
        code: "MACRO_REQUIRED",
      }, { status: 400 });
    }

    let macroBuffer: Buffer;
    try {
      macroBuffer = await downloadImage(macroUrl);
    } catch (e: any) {
      return NextResponse.json({
        error: "Impossible de recuperer la photo macro : " + (e?.message || "erreur"),
        code: "MACRO_DOWNLOAD_FAILED",
      }, { status: 400 });
    }

    const fp = await generateFingerprint(macroBuffer);

    const userId = (user as any).id;
    const sb = getDb();

    // Anti-double-certification (LBC §6.1)
    const { data: existingFps } = await sb
      .from("artworks")
      .select("id, title, artist_id, macro_ahash")
      .eq("certification_status", "certified")
      .not("macro_ahash", "is", null)
      .limit(5000);

    const duplicates: Array<{ id: string; title: string; artist_id: string; similarity: number }> = [];
    for (const row of (existingFps || [])) {
      const otherAhash = (row as any).macro_ahash as string;
      if (!otherAhash || otherAhash.length !== fp.aHash.length) continue;
      const sim = compareFingerprintsHamming(fp.aHash, otherAhash);
      if (sim >= DUPLICATE_THRESHOLD) {
        duplicates.push({
          id: (row as any).id,
          title: (row as any).title,
          artist_id: (row as any).artist_id,
          similarity: sim,
        });
      }
    }
    if (duplicates.length > 0) {
      return NextResponse.json({
        error: "Cette oeuvre semble deja certifiee. Une empreinte visuelle quasi-identique existe deja.",
        code: "DUPLICATE_FINGERPRINT",
        duplicates,
      }, { status: 409 });
    }

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

    const certifiedAt = new Date().toISOString();
    const chainPayload = JSON.stringify({
      artwork_id: artworkId,
      title,
      artist_id: userId,
      macro_fingerprint: fp.combined,
      certified_at: certifiedAt,
    });
    const blockchainHash = "0x" + crypto.createHash("sha256").update(chainPayload).digest("hex");

    const macroZones = (macro_position && typeof macro_position === "string")
      ? { primary: macro_position }
      : null;

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
      listed_at: certifiedAt,
      is_public: hasProfile ? (is_public !== false) : false,
      is_for_sale: hasProfile,
      macro_photo: macroUrl,
      macro_fingerprint: fp.combined,
      macro_ahash: fp.aHash,
      macro_dhash: fp.dHash,
      macro_position: typeof macro_position === "string" ? macro_position : null,
      macro_quality_score: typeof macro_quality_score === "number" ? macro_quality_score : null,
      macro_zones: macroZones,
      fingerprint_version: 1,
      blockchain_hash: blockchainHash,
      certification_status: "certified",
      certification_date: certifiedAt,
      pending_seller_profile: !hasProfile,
    });
    if (artErr) {
      console.error("[artworks/create] insert failed:", artErr.message);
      return NextResponse.json({ error: "Insert oeuvre : " + artErr.message }, { status: 500 });
    }

    if (geolocation && typeof geolocation === "object") {
      console.log("[artworks/create] geo for " + artworkId + ":", JSON.stringify(geolocation));
    }

    return NextResponse.json({
      success: true,
      artwork_id: artworkId,
      pending_seller_profile: !hasProfile,
      next_step: hasProfile ? "published" : "seller_profile",
      certification: {
        status: "certified",
        fingerprint_version: 1,
        macro_fingerprint: fp.combined,
        similarity_hash: fp.similarity_hash,
        has_perceptual: fp.has_perceptual,
        blockchain_hash: blockchainHash,
        certification_date: certifiedAt,
      },
    });
  } catch (e: any) {
    console.error("[artworks/create] error:", e?.message);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
