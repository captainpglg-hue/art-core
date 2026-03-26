import { NextRequest, NextResponse } from "next/server";
import { generateFingerprint } from "@/lib/fingerprint";

// POST: Generate fingerprint from uploaded macro photo
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("macro_photo") as File;

    if (!file) {
      return NextResponse.json({ error: "Photo macro requise" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fingerprint = await generateFingerprint(buffer);

    return NextResponse.json({
      fingerprint: {
        a_hash: fingerprint.aHash,
        d_hash: fingerprint.dHash,
        blockchain_hash: fingerprint.combined,
        similarity_id: fingerprint.similarity_hash,
      },
      image_stats: fingerprint.image_stats,
      comparison: null,
      duplicate_warning: null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
