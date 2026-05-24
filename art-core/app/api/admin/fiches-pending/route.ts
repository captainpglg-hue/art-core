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

    interface PoliceEntryRow {
      id: string;
      entry_number: string | number | null;
      user_id: string | null;
      merchant_id: string | null;
      artwork_id: string | null;
      created_at: string | null;
      purchase_price: number | null;
    }
    interface MerchantRow {
      id: string;
      raison_sociale: string | null;
      siret: string | null;
      email: string | null;
      telephone: string | null;
      numero_rom_prefix: string | null;
    }
    interface ArtworkLiteRow {
      id: string;
      title: string | null;
      photos: unknown;
      category: string | null;
    }

    const typedEntries = (entries || []) as PoliceEntryRow[];
    const merchantIds = Array.from(new Set(typedEntries.map((e) => e.merchant_id).filter((v): v is string => !!v)));
    const artworkIds = Array.from(new Set(typedEntries.map((e) => e.artwork_id).filter((v): v is string => !!v)));

    const [mRes, aRes] = await Promise.all([
      merchantIds.length
        ? sb.from("merchants").select("id, raison_sociale, siret, email, telephone, numero_rom_prefix").in("id", merchantIds)
        : Promise.resolve({ data: [] as MerchantRow[] }),
      artworkIds.length
        ? sb.from("artworks").select("id, title, photos, category").in("id", artworkIds)
        : Promise.resolve({ data: [] as ArtworkLiteRow[] }),
    ]);

    const merchantsById: Record<string, MerchantRow> = Object.fromEntries(
      ((mRes.data || []) as MerchantRow[]).map((m) => [m.id, m]),
    );
    const artworksById: Record<string, ArtworkLiteRow> = Object.fromEntries(
      ((aRes.data || []) as ArtworkLiteRow[]).map((a) => [a.id, a]),
    );

    // Enrichit chaque entrée pending avec métadonnées + signed download URL
    const enriched = await Promise.all(
      pending.map(async (p) => {
        const entry = typedEntries.find((e) => e.id === p.id);
        const merchant = entry?.merchant_id ? merchantsById[entry.merchant_id] : null;
        const artwork = entry?.artwork_id ? artworksById[entry.artwork_id] : null;
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
