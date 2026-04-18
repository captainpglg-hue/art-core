import { NextRequest, NextResponse } from "next/server";
import { generateFingerprint } from "@/lib/fingerprint";
import { queryOne, queryAll } from "@/lib/db";

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

    let comparison = null;
    if (compareHash) {
      const artwork = await queryOne<any>(
        "SELECT id, title, blockchain_hash FROM artworks WHERE blockchain_hash = ?",
        [compareHash]
      );
      if (artwork) {
        comparison = {
          found: true,
          artwork_id: artwork.id,
          artwork_title: artwork.title,
        };
      }
    }

    await queryAll(
      "SELECT id, title, macro_photo, blockchain_hash FROM artworks WHERE macro_photo IS NOT NULL AND macro_photo != ''"
    );

    return NextResponse.json({
      fingerprint: {
        a_hash: fingerprint.aHash,
        d_hash: fingerprint.dHash,
        blockchain_hash: fingerprint.combined,
        similarity_id: fingerprint.similarity_hash,
      },
      image_stats: fingerprint.image_stats,
      comparison,
      duplicate_warning: null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
