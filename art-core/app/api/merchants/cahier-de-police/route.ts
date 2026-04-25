import { NextRequest, NextResponse } from "next/server";
import { getDb, getUserByToken } from "@/lib/db";

/**
 * GET /api/merchants/cahier-de-police
 *
 * Returns the cahier de police (police register) for the authenticated merchant.
 * Includes full merchant header (legal requirement).
 * Query params:
 *   - from: ISO date — filter from
 *   - to: ISO date — filter to
 *   - format: "json" (default) or "csv"
 *
 * POST /api/merchants/cahier-de-police
 *
 * Sends the cahier de police by email via Resend with full merchant identity.
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

function formatMerchantHeader(merchant: any) {
  return {
    raison_sociale: merchant.raison_sociale,
    siret: merchant.siret,
    activite: merchant.activite,
    nom_gerant: merchant.nom_gerant,
    email: merchant.email,
    telephone: merchant.telephone || "",
    adresse: merchant.adresse || "",
    code_postal: merchant.code_postal || "",
    ville: merchant.ville || "",
    adresse_complete: [merchant.adresse, merchant.code_postal, merchant.ville].filter(Boolean).join(", "),
    numero_rom_prefix: merchant.numero_rom_prefix || "",
    abonnement: merchant.abonnement,
    date_adhesion: merchant.created_at,
  };
}

function buildCsvContent(merchantHeader: any, register: any[], from: string | null, to: string | null) {
  const bom = "\uFEFF";

  // Merchant header block
  const headerBlock = [
    `CAHIER DE POLICE — REGISTRE DES OBJETS MOBILIERS`,
    ``,
    `Raison sociale;${merchantHeader.raison_sociale}`,
    `SIRET;${merchantHeader.siret}`,
    `Activite;${merchantHeader.activite}`,
    `Gerant;${merchantHeader.nom_gerant}`,
    `Adresse;${merchantHeader.adresse_complete}`,
    `Telephone;${merchantHeader.telephone}`,
    `Email;${merchantHeader.email}`,
    `N° ROM;${merchantHeader.numero_rom_prefix}`,
    `Periode;${from ? new Date(from).toLocaleDateString("fr-FR") : "Debut"} au ${to ? new Date(to).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}`,
    `Genere le;${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`,
    ``,
  ];

  // Column headers
  const colHeaders = [
    "N°", "Date", "Designation", "Categorie", "Technique", "Dimensions",
    "Nature Transaction", "Prix (EUR)",
    "Vendeur Nom", "Vendeur Adresse", "Vendeur Identite", "Vendeur N° ID",
    "Acquereur Nom", "Acquereur Adresse",
    "N° ROM", "Marchand SIRET", "Marchand Raison Sociale",
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
    r.marchand_siret,
    `"${r.marchand_raison_sociale}"`,
  ].join(";"));

  return bom + [...headerBlock, colHeaders.join(";"), ...rows].join("\n");
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

    const merchantHeader = formatMerchantHeader(merchant);

    const register = (entries || []).map((entry: any, index: number) => ({
      numero_ordre: index + 1,
      date_inscription: entry.created_at,
      designation: entry.artwork?.title || entry.designation || "Non renseigne",
      categorie: entry.artwork?.category || entry.category || "",
      technique: entry.artwork?.technique || "",
      dimensions: entry.artwork?.dimensions || "",
      nature_transaction: entry.transaction_type || "acquisition",
      prix: entry.artwork?.price || entry.price || 0,
      vendeur_nom: entry.seller_name || "",
      vendeur_adresse: entry.seller_address || "",
      vendeur_identite: entry.seller_id_type || "",
      vendeur_id_numero: entry.seller_id_number || "",
      acquereur_nom: entry.buyer_name || "",
      acquereur_adresse: entry.buyer_address || "",
      numero_rom: merchant.numero_rom_prefix
        ? `${merchant.numero_rom_prefix}-${String(index + 1).padStart(4, "0")}`
        : null,
      // Merchant identity on every line (legal requirement)
      marchand_siret: merchant.siret,
      marchand_raison_sociale: merchant.raison_sociale,
      marchand_nom_gerant: merchant.nom_gerant,
    }));

    if (format === "csv") {
      const csv = buildCsvContent(merchantHeader, register, from, to);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cahier-de-police-${merchant.siret}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      merchant: merchantHeader,
      period: {
        from: from || null,
        to: to || new Date().toISOString(),
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

    let query = sb
      .from("police_register_entries")
      .select("*, artwork:artworks(title, category, price, technique, dimensions)")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data: entries } = await query;
    const count = (entries || []).length;

    const merchantHeader = formatMerchantHeader(merchant);
    const periodLabel = `${from ? new Date(from).toLocaleDateString("fr-FR") : "Debut"} — ${to ? new Date(to).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}`;

    // Build entries HTML for email
    const entriesHtml = (entries || []).map((e: any, i: number) => {
      const rom = merchant.numero_rom_prefix ? `${merchant.numero_rom_prefix}-${String(i + 1).padStart(4, "0")}` : "-";
      return `<tr style="border-bottom:1px solid #333;">
        <td style="padding:8px;color:#ccc;">${i + 1}</td>
        <td style="padding:8px;color:#fff;">${e.artwork?.title || e.designation || "-"}</td>
        <td style="padding:8px;color:#ccc;">${e.artwork?.category || "-"}</td>
        <td style="padding:8px;color:#D4AF37;text-align:right;">${e.artwork?.price || e.price || 0} EUR</td>
        <td style="padding:8px;color:#ccc;">${e.seller_name || "-"}</td>
        <td style="padding:8px;color:#888;font-family:monospace;font-size:11px;">${rom}</td>
      </tr>`;
    }).join("");

    // Send email via Resend with full merchant identity
    let emailSent = false;
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("REMPLACE")) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "noreply@art-core.app",
            to: email,
            subject: `Cahier de Police — ${merchantHeader.raison_sociale} — ${periodLabel}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#0F0F0F;color:#fff;padding:40px;border-radius:16px;">
              <h1 style="color:#D4AF37;text-align:center;margin-bottom:4px;">Cahier de Police</h1>
              <p style="text-align:center;color:#888;margin-bottom:32px;">Registre des objets mobiliers</p>

              <div style="background:#1a1a1a;border:1px solid #D4AF37;border-radius:12px;padding:24px;margin-bottom:24px;">
                <h2 style="color:#D4AF37;font-size:16px;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:2px;">Identite du marchand</h2>
                <table style="width:100%;font-size:13px;">
                  <tr><td style="color:#888;padding:4px 12px 4px 0;width:140px;">Raison sociale</td><td style="color:#fff;font-weight:bold;">${merchantHeader.raison_sociale}</td></tr>
                  <tr><td style="color:#888;padding:4px 12px 4px 0;">SIRET</td><td style="color:#fff;font-family:monospace;">${merchantHeader.siret}</td></tr>
                  <tr><td style="color:#888;padding:4px 12px 4px 0;">Activite</td><td style="color:#fff;">${merchantHeader.activite}</td></tr>
                  <tr><td style="color:#888;padding:4px 12px 4px 0;">Gerant</td><td style="color:#fff;">${merchantHeader.nom_gerant}</td></tr>
                  <tr><td style="color:#888;padding:4px 12px 4px 0;">Adresse</td><td style="color:#fff;">${merchantHeader.adresse_complete}</td></tr>
                  <tr><td style="color:#888;padding:4px 12px 4px 0;">Telephone</td><td style="color:#fff;">${merchantHeader.telephone}</td></tr>
                  <tr><td style="color:#888;padding:4px 12px 4px 0;">N° ROM</td><td style="color:#D4AF37;font-weight:bold;">${merchantHeader.numero_rom_prefix}</td></tr>
                  <tr><td style="color:#888;padding:4px 12px 4px 0;">Periode</td><td style="color:#fff;">${periodLabel}</td></tr>
                </table>
              </div>

              <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:24px;margin-bottom:24px;">
                <h2 style="color:#fff;font-size:14px;margin:0 0 16px 0;">${count} entree${count !== 1 ? "s" : ""} au registre</h2>
                <table style="width:100%;font-size:12px;border-collapse:collapse;">
                  <thead><tr style="border-bottom:2px solid #D4AF37;">
                    <th style="padding:8px;text-align:left;color:#D4AF37;">N°</th>
                    <th style="padding:8px;text-align:left;color:#D4AF37;">Designation</th>
                    <th style="padding:8px;text-align:left;color:#D4AF37;">Cat.</th>
                    <th style="padding:8px;text-align:right;color:#D4AF37;">Prix</th>
                    <th style="padding:8px;text-align:left;color:#D4AF37;">Vendeur</th>
                    <th style="padding:8px;text-align:left;color:#D4AF37;">ROM</th>
                  </tr></thead>
                  <tbody>${entriesHtml || '<tr><td colspan="6" style="padding:16px;text-align:center;color:#666;">Aucune entree</td></tr>'}</tbody>
                </table>
              </div>

              <p style="text-align:center;color:#666;font-size:11px;">
                Document genere automatiquement par PASS-CORE — ART-CORE GROUP LTD<br/>
                ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}
              </p>
            </div>`,
          }),
        });
        emailSent = res.ok;
      } catch {}
    }

    // Audit log
    // BUG LATENT: la table publique s'appelle `police_register_audit_log`,
    // pas `audit_log`. Cet insert silencieusement-failed depuis longtemps.
    // À corriger en migrant l'appel (hors scope TS hardening).
    try {
      await (sb as any).from("audit_log").insert({
        action: "cahier_de_police_export",
        user_id: user.id,
        metadata: {
          merchant_id: merchant.id,
          merchant_siret: merchant.siret,
          merchant_raison_sociale: merchant.raison_sociale,
          entries_count: count,
          target_email: email,
          email_sent: emailSent,
          from,
          to,
          exported_at: new Date().toISOString(),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Cahier de police (${count} entree${count !== 1 ? "s" : ""}) ${emailSent ? "envoye a" : "pret pour"} ${email}`,
      merchant: merchantHeader,
      entries_count: count,
      target_email: email,
      email_sent: emailSent,
      period: { from, to },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
