import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ success: false, error: "Image requise" }, { status: 400 });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType = imageFile.type || "image/jpeg";

    if (!ANTHROPIC_API_KEY) {
      // Fallback: return a generic analysis when no API key
      return NextResponse.json({
        success: true,
        analysis: {
          identified: false,
          confidence: 0,
          title: null,
          artist: null,
          year: null,
          movement: null,
          technique: null,
          dimensions: null,
          location: null,
          description: "L'analyse IA est temporairement indisponible. Veuillez configurer la clé API Anthropic.",
          anecdotes: null,
          style_clues: ["Analyse indisponible"],
          probable_artists: [],
          is_likely_original: false,
          red_flags: [],
        },
      });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `Tu es un expert en art avec une connaissance encyclopédique. Analyse cette image d'oeuvre d'art et réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de backticks), avec cette structure exacte :
{
  "identified": boolean,
  "confidence": number (0-100),
  "title": string | null,
  "artist": string | null,
  "year": string | null,
  "movement": string | null,
  "technique": string | null,
  "dimensions": string | null,
  "location": string | null,
  "description": string (150 mots max),
  "anecdotes": string | null,
  "style_clues": string[] (caractéristiques stylistiques visibles),
  "probable_artists": string[] (si non identifié, artistes possibles),
  "is_likely_original": boolean,
  "red_flags": string[] (signes de copie/contrefaçon)
}

Si tu reconnais l'oeuvre, mets identified=true avec un confidence élevé. Sinon, mets identified=false et remplis style_clues et probable_artists.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic Vision error:", err);
      return NextResponse.json({ success: false, error: "Erreur d'analyse IA" }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";

    // Parse JSON response, handling potential markdown wrapping
    let analysis;
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ success: false, error: "Réponse IA invalide" }, { status: 502 });
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error("identify-artwork error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
