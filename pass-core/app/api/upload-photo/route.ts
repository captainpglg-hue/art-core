import { NextRequest, NextResponse } from "next/server";
import { uploadPhoto } from "@/lib/supabase-storage";
import { getUserByToken } from "@/lib/db";

/**
 * POST /api/upload-photo
 * Upload Supabase Storage + URL publique. Auth OPTIONNELLE (parcours dépôt
 * avec signup intégré : photos uploadées AVANT création de session).
 * Body : multipart/form-data avec champ "photo".
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    const user = token ? await getUserByToken(token) : null;

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return NextResponse.json({ error: "Fichier 'photo' manquant" }, { status: 400 });

    const strictQuality = process.env.STRICT_CAPTURE_QUALITY === "1";
    const warnings: string[] = [];

    if (file.size > 10 * 1024 * 1024) {
      if (strictQuality) return NextResponse.json({ error: "Fichier > 10MB. Compressez avant upload." }, { status: 413 });
      console.warn("[upload-photo] permissive: file size > 10MB", file.size);
      warnings.push("Fichier > 10MB — compression recommandée.");
    }

    const contentType = file.type || "";
    if (!contentType.startsWith("image/")) {
      if (strictQuality) return NextResponse.json({ error: "Type de fichier non supporté (attendu: image/*)" }, { status: 400 });
      console.warn("[upload-photo] permissive: non-image MIME", contentType);
      warnings.push(`Type de fichier "${contentType || "inconnu"}" — image attendue.`);
    }

    const folderOverride = formData.get("folder") as string | null;
    const folder = folderOverride || (user ? `artworks/${user.id}` : `artworks/pending`);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadPhoto(buffer, folder, name);

    return NextResponse.json({ url: publicUrl, size: file.size, name, warnings });
  } catch (error: any) {
    console.error("[upload-photo] error:", error?.message);
    return NextResponse.json({ error: error?.message || "Upload error" }, { status: 500 });
  }
}
