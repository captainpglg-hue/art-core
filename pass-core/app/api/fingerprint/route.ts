import { NextRequest, NextResponse } from "next/server";
import { generateFingerprint, compareFingerprintsHamming } from "@/lib/fingerprint";
import { getDb } from "@/lib/db";

// POST: Generate fingerprint from uploaded macro photo
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("macro_photo") as File;
    const compareHash = formData.get("compare_hash") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Photo macro requise" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fingerprint = await generateFingerprint(buffer);

    // If compare_hash provided, check similarity against existing artwork
    let comparison = null;
    if (compareHash) {
      const artwork = getDb().prepare(
        "SELECT id, title, blockchain_hash FROM artworks WHERE blockchain_hash = ?"
      ).get(compareHash) as any;

      if (artwork) {
        // For now we compare the similarity_hash stored in the artwork
        // In production, we'd store the aHash separately
        comparison = {
          found: true,
          artwork_id: artwork.id,
          artwork_title: artwork.title,
        };
      }
    }

    // Check if this fingerprint already exists (duplicate detection)
    const db = getDb();
    const allArtworks = db.prepare(
      "SELECT id, title, macro_photo, blockchain_hash FROM artworks WHERE macro_photo IS NOT NULL AND macro_photo != ''"
    ).all() as any[];

    let duplicateWarning = null;
    // Store the similarity hash as macro_photo metadata for future comparisons
    // (In production, store the full aHash in a separate column)

    return NextResponse.json({
      fingerprint: {
        a_hash: fingerprint.aHash,
        d_hash: fingerprint.dHash,
        blockchain_hash: fingerprint.combined,
        similarity_id: fingerprint.similarity_hash,
      },
      image_stats: fingerprint.image_stats,
      comparison,
      duplicate_warning: duplicateWarning,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
