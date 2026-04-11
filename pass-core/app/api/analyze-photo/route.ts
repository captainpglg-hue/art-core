import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File;
    if (!file) return NextResponse.json({ error: "Photo requise" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    // ── 1. Resolution check ──────────────────────────────
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const megapixels = (width * height) / 1_000_000;
    // Macro should be at least 1MP for decent texture detail
    const resolutionScore = Math.min(100, Math.round((megapixels / 2) * 100));

    // ── 2. Sharpness (Laplacian variance on greyscale) ───
    const grey = await image.greyscale().resize(256, 256, { fit: "fill" }).raw().toBuffer();
    let laplacianSum = 0;
    const w = 256;
    for (let y = 1; y < 255; y++) {
      for (let x = 1; x < 255; x++) {
        const idx = y * w + x;
        const lap = Math.abs(
          -grey[idx - w] - grey[idx - 1] + 4 * grey[idx] - grey[idx + 1] - grey[idx + w]
        );
        laplacianSum += lap * lap;
      }
    }
    const laplacianVar = laplacianSum / (254 * 254);
    // Empirical: sharp macro photos have variance > 500, blurry < 100
    const sharpnessScore = Math.min(100, Math.round(Math.sqrt(laplacianVar) * 2));

    // ── 3. Brightness ────────────────────────────────────
    const channels = stats.channels;
    const avgBrightness = channels.reduce((s, c) => s + c.mean, 0) / channels.length;
    // Ideal brightness: 80-180 (out of 255)
    let brightnessScore: number;
    if (avgBrightness < 40) brightnessScore = Math.round((avgBrightness / 40) * 50);
    else if (avgBrightness > 220) brightnessScore = Math.round(((255 - avgBrightness) / 35) * 50);
    else if (avgBrightness >= 80 && avgBrightness <= 180) brightnessScore = 100;
    else if (avgBrightness < 80) brightnessScore = 50 + Math.round(((avgBrightness - 40) / 40) * 50);
    else brightnessScore = 50 + Math.round(((220 - avgBrightness) / 40) * 50);

    // ── 4. Contrast ──────────────────────────────────────
    const channelRanges = channels.map((c: any) => (c.max ?? c.maxVal ?? 255) - (c.min ?? c.minVal ?? 0));
    const avgRange = channelRanges.reduce((s, r) => s + r, 0) / channelRanges.length;
    // Good contrast: range > 150
    const contrastScore = Math.min(100, Math.round((avgRange / 180) * 100));

    // ── 5. Detail density (edge detection) ───────────────
    let edgeCount = 0;
    const threshold = 30;
    for (let y = 0; y < 255; y++) {
      for (let x = 0; x < 255; x++) {
        const idx = y * w + x;
        const dx = Math.abs(grey[idx] - grey[idx + 1]);
        const dy = Math.abs(grey[idx] - grey[idx + w]);
        if (dx > threshold || dy > threshold) edgeCount++;
      }
    }
    const edgeDensity = edgeCount / (255 * 255);
    // Good macro: lots of edges (texture detail) > 20%
    const detailScore = Math.min(100, Math.round(edgeDensity * 300));

    // ── Global score ─────────────────────────────────────
    const globalScore = Math.round(
      sharpnessScore * 0.35 +
      detailScore * 0.25 +
      resolutionScore * 0.15 +
      brightnessScore * 0.15 +
      contrastScore * 0.10
    );

    // ── Feedback messages ────────────────────────────────
    const issues: string[] = [];
    const tips: string[] = [];

    if (sharpnessScore < 40) { issues.push("Trop flou"); tips.push("Stabilisez votre téléphone et faites la mise au point"); }
    else if (sharpnessScore < 70) tips.push("Légèrement flou — essayez de stabiliser");

    if (brightnessScore < 40) {
      if (avgBrightness < 60) { issues.push("Trop sombre"); tips.push("Ajoutez de la lumière ou activez le flash"); }
      else { issues.push("Surexposé"); tips.push("Réduisez la luminosité ou changez d'angle"); }
    }

    if (contrastScore < 40) { tips.push("Contraste faible — changez l'angle de lumière"); }

    if (detailScore < 30) { issues.push("Pas assez de détail"); tips.push("Rapprochez-vous à 2-3 cm de la surface"); }
    else if (detailScore < 60) tips.push("Rapprochez-vous un peu plus pour capter la texture");

    if (resolutionScore < 50) tips.push("Utilisez la meilleure résolution de votre caméra");

    let status: "excellent" | "acceptable" | "insufficient";
    let message: string;
    if (globalScore >= 80) { status = "excellent"; message = "Photo excellente — détail suffisant pour certification"; }
    else if (globalScore >= 50) { status = "acceptable"; message = "Photo correcte mais perfectible — rapprochez-vous"; }
    else { status = "insufficient"; message = "Photo insuffisante — recommencez"; }

    return NextResponse.json({
      score: globalScore,
      status,
      message,
      issues,
      tips,
      details: {
        sharpness: { score: sharpnessScore, label: sharpnessScore >= 70 ? "Net" : sharpnessScore >= 40 ? "Correct" : "Flou" },
        detail: { score: detailScore, label: detailScore >= 60 ? "Riche" : detailScore >= 30 ? "Moyen" : "Insuffisant" },
        brightness: { score: brightnessScore, label: brightnessScore >= 70 ? "Bonne" : avgBrightness < 80 ? "Sombre" : "Claire" },
        contrast: { score: contrastScore, label: contrastScore >= 60 ? "Bon" : "Faible" },
        resolution: { score: resolutionScore, value: `${width}x${height}`, megapixels: megapixels.toFixed(1) },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
