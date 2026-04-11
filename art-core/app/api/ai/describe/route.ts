import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { title, technique, dimensions, type } = await req.json();

    const prompts: Record<string, string> = {
      artwork: `Tu es expert en art contemporain. A partir de ces informations : titre="${title}", technique="${technique}", dimensions="${dimensions}", genere une description de 100-150 mots pour une marketplace d'art haut de gamme. Ton sobre, elegant, valorisant. Pas de jargon. Termine par une invitation a l'acheteur. Reponds uniquement avec la description, sans guillemets ni prefixe.`,
      artist: `Tu es expert en art contemporain. Genere une bio courte (150 mots max) pour un artiste nomme "${title}" specialise en "${technique}". Ton chaleureux et professionnel, valorisant son parcours et sa vision. Pas de jargon. Reponds uniquement avec la bio.`,
      space: `Pour une oeuvre de ${dimensions} en ${technique}, sugere en une phrase les espaces interieurs ideaux (salon, bureau, chambre, entree, etc). Reponds uniquement avec la suggestion, sans prefixe.`,
    };

    const prompt = prompts[type || "artwork"] || prompts.artwork;

    if (!ANTHROPIC_API_KEY) {
      // Fallback sans API key
      const fallbacks: Record<string, string> = {
        artwork: `${title} est une oeuvre ${technique ? `realisee en ${technique}` : "unique"} ${dimensions ? `de ${dimensions}` : ""}. Cette piece temoigne d'une maitrise remarquable et d'une sensibilite artistique affirmee. Les jeux de lumiere et de texture invitent a la contemplation et transforment l'espace qui l'accueille. Une oeuvre qui ne laisse pas indifferent et qui trouvera naturellement sa place dans votre interieur.`,
        artist: `Artiste passionne et engage, ${title} explore les frontieres de l'art ${technique || "contemporain"} avec une approche personnelle et authentique. Son travail, reconnu pour sa sincerite et sa maitrise technique, invite le spectateur a un voyage interieur.`,
        space: `Cette oeuvre s'integre parfaitement dans un salon, un bureau ou une entree.`,
      };
      return NextResponse.json({ description: fallbacks[type || "artwork"] });
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
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ description: `${title} — oeuvre ${technique || "originale"} ${dimensions ? `(${dimensions})` : ""}. Une piece unique qui merite d'etre decouverte.` });
    }

    const data = await res.json();
    const description = data.content?.[0]?.text || "";

    return NextResponse.json({ description });
  } catch (error: any) {
    return NextResponse.json({ description: "Description en cours de generation..." });
  }
}
