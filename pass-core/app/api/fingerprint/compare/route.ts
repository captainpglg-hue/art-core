import { NextRequest, NextResponse } from "next/server";
import { generateFingerprint, compareFingerprints, compareFingerprintsHamming } from "@/lib/fingerprint";
import { getDb } from "@/lib/db";

/**
 * POST /api/fingerprint/compare
 *
 * Compares two fingerprints and returns similarity score.
 *
 * Accepts:
 *   - Two photo files: { photo1: File, photo2: File }
 *   - OR one photo + artwork ID: { photo: File, artwork_id: string }
 *   - OR two raw fingerprint objects: { fp1: FingerprintResult, fp2: FingerprintResult }
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const photo1 = formData.get("photo1") as File | null;
      const photo2 = formData.get("photo2") as File | null;
      const photo = formData.get("photo") as File | null;
      const artworkId = formData.get("artwork_id") as string | null;

      // Mode 1: two photos directly
      if (photo1 && photo2 && photo1.size > 0 && photo2.size > 0) {
        const [buf1, buf2] = await Promise.all([
          photo1.arrayBuffer().then(Buffer.from),
          photo2.arrayBuffer().then(Buffer.from),
        ]);
        const [fp1, fp2] = await Promise.all([
          generateFingerprint(buf1),
          generateFingerprint(buf2),
        ]);
        const result = compareFingerprints(fp1, fp2);
        return NextResponse.json({
          score: result.score,
          authentic: result.score >= 62.5,
          verdict: result.score >= 62.5 ? "match" : result.score >= 50 ? "uncertain" : "no_match",
          scores: result.scores,
          fp1_stats: fp1.image_stats,
          fp2_stats: fp2.image_stats,
        });
      }

      // Mode 2: photo + artwork_id
      if (photo && photo.size > 0 && artworkId) {
        const buf = Buffer.from(await photo.arrayBuffer());
        const fp = await generateFingerprint(buf);

        const sb = getDb();
        const { data: art } = await sb
          .from("artworks")
          .select("macro_ahash, macro_dhash, macro_phash, macro_radial_hist, macro_texture_lbp")
          .eq("id", artworkId)
          .single();

        if (!art || (!art.macro_ahash && !art.macro_dhash)) {
          return NextResponse.json({ error: "Aucun fingerprint stocké pour cette oeuvre" }, { status: 404 });
        }

        let score: number;
        let scores: Record<string, number>;

        if (art.macro_phash) {
          const phash = compareFingerprintsHamming(fp.pHash, art.macro_phash);
          const dhash = compareFingerprintsHamming(fp.dHash, art.macro_dhash);
          const ahash = compareFingerprintsHamming(fp.aHash, art.macro_ahash);
          const radial = art.macro_radial_hist ? compareFingerprintsHamming(fp.radialHist, art.macro_radial_hist) : 0;
          const texture = art.macro_texture_lbp ? compareFingerprintsHamming(fp.textureLBP, art.macro_texture_lbp) : 0;
          score = Math.round((phash * 0.4 + dhash * 0.25 + ahash * 0.15 + radial * 0.1 + texture * 0.1) * 100) / 100;
          scores = { phash, dhash, ahash, radial, texture };
        } else {
          const ahash = compareFingerprintsHamming(fp.aHash, art.macro_ahash);
          const dhash = compareFingerprintsHamming(fp.dHash, art.macro_dhash);
          score = Math.round((ahash * 0.6 + dhash * 0.4) * 100) / 100;
          scores = { ahash, dhash };
        }

        return NextResponse.json({
          score,
          authentic: score >= 62.5,
          verdict: score >= 62.5 ? "match" : score >= 50 ? "uncertain" : "no_match",
          scores,
        });
      }

      return NextResponse.json({ error: "Fournissez photo1+photo2 ou photo+artwork_id" }, { status: 400 });
    }

    // JSON mode: raw fingerprint objects
    const body = await req.json();
    const { fp1, fp2 } = body;
    if (!fp1 || !fp2) {
      return NextResponse.json({ error: "fp1 et fp2 requis" }, { status: 400 });
    }

    const result = compareFingerprints(fp1, fp2);
    return NextResponse.json({
      score: result.score,
      authentic: result.score >= 62.5,
      verdict: result.score >= 62.5 ? "match" : result.score >= 50 ? "uncertain" : "no_match",
      scores: result.scores,
    });
  } catch (error: any) {
    console.error("Fingerprint compare error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
