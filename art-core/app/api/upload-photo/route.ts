import { NextRequest, NextResponse } from "next/server";
import { uploadPhoto } from "@/lib/supabase-storage";
import { getUserByToken } from "@/lib/db";

export const maxDuration = 20;
export const runtime = "nodejs";

const REQUEST_DEADLINE_MS = 15_000;
const AUTH_LOOKUP_DEADLINE_MS = 1500;
const UPLOAD_DEADLINE_MS = 12_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout (${ms}ms) on ${label}`)), ms)
    ),
  ]);
}

function ts() { return new Date().toISOString(); }
function log(step: string, extra: Record<string, unknown> = {}) {
  console.log(`[upload-photo] ${ts()} ${step}`, extra);
}

/**
 * POST /api/upload-photo
 *
 * Uploade une photo vers Supabase Storage (bucket "artworks") et renvoie
 * l'URL publique. Auth OPTIONNELLE : le parcours dépôt + signup intégré upload
 * les photos AVANT de créer le compte.
 *
 * Body : multipart/form-data avec le champ "photo" (File)
 * Optional : "folder" (string, default: "artworks/<userId>" ou "artworks/pending")
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  log("start");

  try {
    return await withTimeout(handleUpload(req), REQUEST_DEADLINE_MS, "upload-photo");
  } catch (error: any) {
    const isTimeout = /^timeout/i.test(error?.message || "");
    console.error(`[upload-photo] ${ts()} ${isTimeout ? "DEADLINE" : "ERROR"}`, {
      message: error?.message,
      ms: Date.now() - t0,
    });
    return NextResponse.json({
      error: error?.message || "Upload error",
      code: isTimeout ? "DEADLINE_EXCEEDED" : "INTERNAL",
    }, { status: isTimeout ? 504 : 500 });
  } finally {
    log("end", { ms: Date.now() - t0 });
  }
}

async function handleUpload(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("core_session")?.value;

  // L'auth est OPTIONNELLE : si la résolution du token traîne (postgres dégradé),
  // on n'attend pas — on fallback sur le folder anonyme. Avant ce garde-fou,
  // getUserByToken pouvait pendre et bloquer toute la fonction alors que
  // Supabase Storage avait déjà reçu le fichier.
  let user: any = null;
  if (token) {
    try {
      user = await withTimeout(getUserByToken(token), AUTH_LOOKUP_DEADLINE_MS, "getUserByToken");
    } catch (e: any) {
      console.warn(`[upload-photo] auth lookup skipped (${e?.message}) — uploading as anonymous`);
    }
  }

  log("parse formData");
  const formData = await req.formData();
  const file = formData.get("photo") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Fichier 'photo' manquant" }, { status: 400 });
  }

  // Kill switch qualité photo : STRICT_CAPTURE_QUALITY=1 → ancien comportement
  // bloquant. Sinon (défaut) : warnings non bloquants.
  const strictQuality = process.env.STRICT_CAPTURE_QUALITY === "1";
  const warnings: string[] = [];

  if (file.size > 10 * 1024 * 1024) {
    if (strictQuality) {
      return NextResponse.json({ error: "Fichier > 10MB. Compressez avant upload." }, { status: 413 });
    }
    console.warn("[upload-photo] warning: file size > 10MB, accepted in permissive mode", file.size);
    warnings.push("Fichier > 10MB — compression recommandée.");
  }

  const contentType = file.type || "";
  if (!contentType.startsWith("image/")) {
    if (strictQuality) {
      return NextResponse.json({ error: "Type de fichier non supporté (attendu: image/*)" }, { status: 400 });
    }
    console.warn("[upload-photo] warning: non-image MIME type, accepted in permissive mode", contentType);
    warnings.push(`Type de fichier "${contentType || "inconnu"}" — image attendue.`);
  }

  const folderOverride = formData.get("folder") as string | null;
  const folder = folderOverride || (user ? `artworks/${user.id}` : `artworks/pending`);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

  log("read buffer", { size: file.size });
  const buffer = Buffer.from(await file.arrayBuffer());

  log("upload to storage", { folder, name, size: buffer.length });
  const publicUrl = await withTimeout(uploadPhoto(buffer, folder, name), UPLOAD_DEADLINE_MS, "uploadPhoto");
  log("upload done", { url: publicUrl });

  return NextResponse.json({ url: publicUrl, size: file.size, name, warnings });
}
