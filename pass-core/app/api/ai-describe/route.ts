import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { title, technique, dimensions, year } = await req.json();
    const prompt = `Tu es expert en art contemporain. Genere une description elegante de 120 mots pour : titre="${title}", technique="${technique}", dimensions="${dimensions}", annee="${year || ""}". Ton sobre et valorisant. Termine par une invitation a l'acheteur. Reponds uniquement avec la description.`;

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ description: `${title} est une oeuvre ${technique ? "en " + technique : "unique"} ${dimensions ? "de " + dimensions : ""}. Cette piece temoigne d'une maitrise remarquable. Les jeux de lumiere et de texture invitent a la contemplation. Une oeuvre qui trouvera naturellement sa place dans votre interieur.` });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 250, messages: [{ role: "user", content: prompt }] }),
    });

    if (!res.ok) return NextResponse.json({ description: `${title} — oeuvre ${technique || "originale"}. Une piece unique a decouvrir.` });
    const data = await res.json();
    return NextResponse.json({ description: data.content?.[0]?.text || "" });
  } catch {
    return NextResponse.json({ description: "Description en cours de generation..." });
  }
}
