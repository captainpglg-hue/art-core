import { NextRequest, NextResponse } from "next/server";
import { getDb, getUserByToken } from "@/lib/db";

/**
 * GET /api/merchants/cahier-de-police
 *
 * Returns the cahier de police (police register) entries for the authenticated merchant.
 * Query params:
 *   - from: ISO date (optional) — filter entries from this date
 *   - to: ISO date (optional) — filter entries up to this date
 *   - format: "json" (default) or "csv"
 *
 * POST /api/merchants/cahier-de-police
 *
 * Sends the cahier de police by email to the merchant (or downloads as structured data).
 * Body: { email?: string, from?: string, to?: string }
 */

async function getMerchantForUser(userId: string) {
  const sb = getDb();
  const { data } = await sb
    .from("merchants")
    .select("*")
    .eq("user_id", userId)
    .eq("actif", true)
    .single();
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const merchant = await getMerchantForUser(user.id);
    if (!merchant) {
      return NextResponse.json({ error: "Compte marchand introuvable" }, { status: 403 });
    }

    const sb = getDb();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const format = searchParams.get("format") || "json";

    // Fetch police register entries for this merchant
    let query = sb
      .from("police_register_entries")
      .select("*, artwork:artworks(title, category, technique, dimensions, price, artist_id, photos)")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data: entries, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Erreur lecture registre: " + error.message }, { status: 500 });
    }

    const register = (entries || []).map((entry: any, index: number) => ({
      numero_ordre: index + 1,
      date_inscription: entry.created_at,
      // Object description
      designation: entry.artwork?.title || entry.designation || "Non renseigne",
      categorie: entry.artwork?.category || entry.category || "",
      technique: entry.artwork?.technique || "",
      dimensions: entry.artwork?.dimensions || "",
      // Transaction
      nature_transaction: entry.transaction_type || "acquisition",
      prix: entry.artwork?.price || entry.price || 0,
      // Parties
      vendeur_nom: entry.seller_name || "",
      vendeur_adresse: entry.seller_address || "",
      vendeur_identite: entry.seller_id_type || "",
      vendeur_id_numero: entry.seller_id_number || "",
      acquereur_nom: entry.buyer_name || "",
      acquereur_adresse: entry.buyer_address || "",
      // Compliance
      numero_rom: merchant.numero_rom_prefix
        ? `${merchant.numero_rom_prefix}-${String(index + 1).padStart(4, "0")}`
        : null,
      merchant_siret: merchant.siret,
      merchant_raison_sociale: merchant.raison_sociale,
    }));

    // CSV format
    if (format === "csv") {
      const headers = [
        "N° Ordre", "Date", "Designation", "Categorie", "Technique",
        "Dimensions", "Nature Transaction", "Prix (EUR)", "Vendeur Nom",
        "Vendeur Adresse", "Vendeur Identite", "Vendeur N° ID",
        "Acquereur Nom", "Acquereur Adresse", "N° ROM", "SIRET", "Raison Sociale",
      ];

      const rows = register.map((r: any) => [
        r.numero_ordre,
        new Date(r.date_inscription).toLocaleDateString("fr-FR"),
        `"${(r.designation || "").replace(/"/g, '""')}"`,
        r.categorie,
        r.technique,
        r.dimensions,
        r.nature_transaction,
        r.prix,
        `"${(r.vendeur_nom || "").replace(/"/g, '""')}"`,
        `"${(r.vendeur_adresse || "").replace(/"/g, '""')}"`,
        r.vendeur_identite,
        r.vendeur_id_numero,
        `"${(r.acquereur_nom || "").replace(/"/g, '""')}"`,
        `"${(r.acquereur_adresse || "").replace(/"/g, '""')}"`,
        r.numero_rom || "",
        r.merchant_siret,
        `"${r.merchant_raison_sociale}"`,
      ].join(";"));

      const csv = [headers.join(";"), ...rows].join("\n");
      const bom = "\uFEFF"; // UTF-8 BOM for Excel

      return new NextResponse(bom + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cahier-de-police-${merchant.siret}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      merchant: {
        raison_sociale: merchant.raison_sociale,
        siret: merchant.siret,
        activite: merchant.activite,
        nom_gerant: merchant.nom_gerant,
        adresse: merchant.adresse,
        code_postal: merchant.code_postal,
        ville: merchant.ville,
        numero_rom_prefix: merchant.numero_rom_prefix,
      },
      entries: register,
      total: register.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const merchant = await getMerchantForUser(user.id);
    if (!merchant) {
      return NextResponse.json({ error: "Compte marchand introuvable" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = body.email || merchant.email;
    const from = body.from || null;
    const to = body.to || null;

    const sb = getDb();

    // Fetch register entries
    let query = sb
      .from("police_register_entries")
      .select("*, artwork:artworks(title, category, price)")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data: entries } = await query;
    const count = (entries || []).length;

    // Log the export action
    try {
      await sb.from("audit_log").insert({
        action: "cahier_de_police_export",
        user_id: user.id,
        metadata: {
          merchant_id: merchant.id,
          entries_count: count,
          target_email: email,
          from,
          to,
          exported_at: new Date().toISOString(),
        },
      });
    } catch {}

    // In production, this would send the PDF via email (Resend API)
    // For now, return confirmation with data summary
    return NextResponse.json({
      success: true,
      message: `Cahier de police (${count} entree${count !== 1 ? "s" : ""}) pret pour envoi a ${email}`,
      merchant: merchant.raison_sociale,
      entries_count: count,
      target_email: email,
      period: { from, to },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
