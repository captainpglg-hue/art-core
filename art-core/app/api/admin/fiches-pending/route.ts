// ============================================================================
// GET /api/admin/fiches-pending
// Liste les fiches de police en attente d'envoi manuel (fallback quand l'email
// automatique n'a pas pu partir). Jointure avec police_register_entries +
// merchants + artworks pour afficher les métadonnées.
//
// Auth : user.role === "admin" via core_session cookie.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";
import { listPendingFiches, getFicheDownloadUrl } from "@/lib/fiches-storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Accès admin uniquement" }, { status: 403 });
    }

    const pending = await listPendingFiches();
    if (pending.length === 0) {
      return NextResponse.json({ fiches: [], count: 0 });
    }

    // Join avec police_register_entries + merchants + artworks
    const sb = getDb();
    const entryIds = pending.map(p => p.id);
    const { data: entries } = await sb
      .from("police_register_entries")
      .select("id, entry_number, user_id, merchant_id, artwork_id, created_at, purchase_price")
      .in("id", entryIds);

    const merchantIds = Array.from(new Set((entries || []).map((e: any) => e.merchant_id)));
    const artworkIds = Array.from(new Set((entries || []).map((e: any) => e.artwork_id)));

    const [mRes, aRes] = await Promise.all([
      merchantIds.length
        ? sb.from("merchants").select("id, raison_sociale, siret, email, telephone, numero_rom_prefix").in("id", merchantIds)
        : Promise.resolve({ data: [] }),
      artworkIds.length
        ? sb.from("artworks").select("id, title, photos, category").in("id", artworkIds)
        : Promise.resolve({ data: [] }),
    ]);

    const merchantsById: Record<string, any> = Object.fromEntries(((mRes as any).data || []).map((m: any) => [m.id, m]));
    const artworksById: Record<string, any> = Object.fromEntries(((aRes as any).data || []).map((a: any) => [a.id, a]));

    // Enrichit chaque entrée pending avec métadonnées + signed download URL
    const enriched = await Promise.all(
      pending.map(async (p) => {
        const entry = (entries || []).find((e: any) => e.id === p.id);
        const merchant = entry ? merchantsById[entry.merchant_id] : null;
        const artwork = entry ? artworksById[entry.artwork_id] : null;
        let downloadUrl = null;
        try { downloadUrl = await getFicheDownloadUrl(p.id, "pending"); } catch {}
        return {
          entry_id: p.id,
          entry_number: entry?.entry_number || null,
          created_at: entry?.created_at || p.created_at,
          recipient_email: merchant?.email || null,
          merchant_name: merchant?.raison_sociale || null,
          merchant_rom: merchant?.numero_rom_prefix || null,
          artwork_title: artwork?.title || null,
          artwork_category: artwork?.category || null,
          purchase_price: entry?.purchase_price || null,
          pdf_size_bytes: p.size,
          download_url: downloadUrl,
        };
      })
    );

    return NextResponse.json({ fiches: enriched, count: enriched.length });
  } catch (e: any) {
    console.error("[GET /api/admin/fiches-pending]", e?.message);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
