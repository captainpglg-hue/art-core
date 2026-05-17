import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

/**
 * POST /api/messages/start
 * Body: { to: string (user_id), artwork_id?: string }
 *
 * Endpoint utilitaire pour "Contacter le vendeur" depuis la page œuvre.
 * Calcule l'ID de conversation dérivé entre l'utilisateur courant et le destinataire,
 * et le renvoie. Vérifie que le destinataire existe.
 *
 * Aucun message n'est créé — c'est juste un calculateur d'ID + validation. La page
 * thread permet ensuite d'envoyer le premier message via /api/messages POST normal.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const to: string | undefined = body.to;
    const artwork_id: string | null = body.artwork_id ?? null;

    if (!to) return NextResponse.json({ error: "to (user_id) requis" }, { status: 400 });
    if (to === user.id)
      return NextResponse.json({ error: "Impossible de se contacter soi-même" }, { status: 400 });

    // Vérifie que le destinataire existe (anti-spam d'IDs random)
    const sb = getDb();
    const { data: dest } = await sb.from("users").select("id").eq("id", to).maybeSingle();
    if (!dest) return NextResponse.json({ error: "Destinataire introuvable" }, { status: 404 });

    const [a, b] = [user.id, to].sort();
    const conversation_id = artwork_id ? `conv_${a}_${b}_${artwork_id}` : `conv_${a}_${b}`;

    return NextResponse.json({ conversation_id, to, artwork_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/messages/start] exception:", msg);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
