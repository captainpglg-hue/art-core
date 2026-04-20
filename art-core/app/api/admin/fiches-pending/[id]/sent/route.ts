// ============================================================================
// POST /api/admin/fiches-pending/[id]/sent
// Marque une fiche comme envoyée manuellement par l'admin : déplace le PDF du
// dossier Storage pending/ vers sent/.
// Auth : user.role === "admin".
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserByToken } from "@/lib/db";
import { markFicheSent } from "@/lib/fiches-storage";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Accès admin uniquement" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    await markFicheSent(id);
    return NextResponse.json({ success: true, entry_id: id, marked_sent_at: new Date().toISOString() });
  } catch (e: any) {
    console.error("[POST /api/admin/fiches-pending/[id]/sent]", e?.message);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
