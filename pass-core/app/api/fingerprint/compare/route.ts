import { NextRequest, NextResponse } from "next/server";
import { generateFingerprint, FingerprintResult } from "@/lib/fingerprint";
import { queryOne } from "@/lib/db";

/**
 * POST /api/fingerprint/compare
 *
 * Compares two fingerprints using aHash + dHash (Hamming distance).
 *
 * Accepts:
 *   - Two photo files: { photo1: File, photo2: File }
 *   - OR one photo + artwork ID: { photo: File, artwork_id: string }
 *   - OR two raw fingerprint objects: { fp1: FingerprintResult, fp2: FingerprintResult }
 */

function hammingSimilarity(h1: string, h2: string): number {
  if (!h1 || !h2 || h1.length !== h2.length) return 0;
  let distance = 0;
  for (let i = 0; i < h1.length; i++) {
    const b1 = parseInt(h1[i], 16);
    const b2 = parseInt(h2[i], 16);
    let xor = b1 ^ b2;
    while (xor) { distance += xor & 1; xor >>= 1; }
  }
  const maxBits = h1.length * 4;
  return Math.round((1 - distance / maxBits) * 10000) / 100;
}

function compareFingerprints(fp1: FingerprintResult, fp2: FingerprintResult) {
  const ahash = hammingSimilarity(fp1.aHash, fp2.aHash);
  const dhash = hammingSimilarity(fp1.dHash, fp2.dHash);
  const score = Math.round((ahash * 0.6 + dhash * 0.4) * 100) / 100;
  return { score, scores: { ahash, dhash } };
}

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

      // Mode 2: photo + artwork_id — fetch stored macro photo and compare
      if (photo && photo.size > 0 && artworkId) {
        const buf = Buffer.from(await photo.arrayBuffer());
        const fp = await generateFingerprint(buf);

        const art = await queryOne<{ macro_photo?: string }>(
          "SELECT macro_photo FROM artworks WHERE id = ?",
          [artworkId]
        );

        if (!art || !art.macro_photo) {
          return NextResponse.json({ error: "Aucune photo macro stockée pour cette oeuvre" }, { status: 404 });
        }

        // Fetch the stored macro photo and generate its fingerprint
        const macroRes = await fetch(art.macro_photo);
        if (!macroRes.ok) {
          return NextResponse.json({ error: "Impossible de récupérer la photo macro stockée" }, { status: 502 });
        }
        const macroBuf = Buffer.from(await macroRes.arrayBuffer());
        const fpStored = await generateFingerprint(macroBuf);

        const result = compareFingerprints(fp, fpStored);
        return NextResponse.json({
          score: result.score,
          authentic: result.score >= 62.5,
          verdict: result.score >= 62.5 ? "match" : result.score >= 50 ? "uncertain" : "no_match",
          scores: result.scores,
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

    const result = compareFingerprints(fp1 as FingerprintResult, fp2 as FingerprintResult);
    return NextResponse.json({
      score: result.score,
      authentic: result.score >= 62.5,
      verdict: result.score >= 62.5 ? "match" : result.score >= 50 ? "uncertain" : "no_match",
      scores: result.scores,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fingerprint compare error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
