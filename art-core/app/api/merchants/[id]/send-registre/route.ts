import { NextRequest, NextResponse } from "next/server";
import { getDb, getUserByToken } from "@/lib/db";
import { cookies } from "next/headers";
import PDFDocument from "pdfkit";

const NAVY = "#0D1B2A";
const GOLD = "#B8960C";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F5F5F0";
const DARK_GRAY = "#333333";
const MEDIUM_GRAY = "#666666";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const merchantId = params.id;
    const sb = getDb();

    const { data: merchant } = await sb
      .from("merchants")
      .select("*")
      .eq("id", merchantId)
      .single();

    if (!merchant || !merchant.user_id || merchant.user_id !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { data: entries } = await sb
      .from("police_register_entries")
      .select("*")
      .eq("user_id", merchant.user_id)
      .order("entry_number", { ascending: true });

    const entryList = entries || [];

    let mode = "download";
    try {
      const body = await req.json();
      mode = body.mode || "download";
    } catch {}

    // Generate PDF
    const pdfBuffer = await generateRegistrePDF(merchant, entryList);

    if (mode === "download" || mode === "requisition") {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="registre-police-${merchant.numero_rom_prefix}-${new Date().toISOString().split("T")[0]}.pdf"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ success: true, entriesCount: entryList.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateRegistrePDF(merchant: any, entries: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 30, bufferPages: true, layout: "landscape" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 30;
      const contentWidth = pageWidth - 2 * margin;
      const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

      // Header
      doc.rect(0, 0, pageWidth, 60).fill(NAVY);
      doc.fontSize(18).font("Helvetica-Bold").fillColor(GOLD)
        .text("REGISTRE DE POLICE", margin, 10, { width: contentWidth, align: "center" });
      doc.fontSize(9).font("Helvetica").fillColor(WHITE)
        .text("Cahier des Objets Mobiliers — Art. 321-7 Code pénal", margin, 32, { width: contentWidth, align: "center" });
      doc.fontSize(8).fillColor(GOLD)
        .text(`ROM: ${merchant.numero_rom_prefix}`, margin, 45, { width: contentWidth, align: "center" });

      let y = 68;

      // Merchant info
      doc.rect(margin, y, contentWidth, 36).lineWidth(0.5).stroke(GOLD);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(DARK_GRAY)
        .text(`${merchant.raison_sociale}  |  SIRET: ${merchant.siret}  |  ROM: ${merchant.numero_rom_prefix}`, margin + 8, y + 4, { width: contentWidth - 16 });
      doc.fontSize(7).font("Helvetica").fillColor(MEDIUM_GRAY)
        .text(`${merchant.adresse}, ${merchant.code_postal} ${merchant.ville}  |  Activité: ${merchant.activite}  |  Gérant: ${merchant.nom_gerant}`, margin + 8, y + 18, { width: contentWidth - 16 });
      y += 42;

      // Stats
      const active = entries.filter((e: any) => !e.is_voided);
      const totalValue = active.reduce((s: number, e: any) => s + Number(e.purchase_price || 0), 0);
      const totalFormatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(totalValue);
      doc.fontSize(8).font("Helvetica").fillColor(DARK_GRAY)
        .text(`Entrées: ${entries.length}  |  Actives: ${active.length}  |  Valeur totale: ${totalFormatted}`, margin, y, { width: contentWidth, align: "center" });
      y += 16;

      // Table header
      const cols = [
        { label: "N°", width: 35 }, { label: "Date", width: 65 }, { label: "N° Ordre", width: 55 },
        { label: "Description", width: 180 }, { label: "Provenance", width: 120 }, { label: "Prix", width: 65 },
        { label: "Identité vendeur", width: 140 }, { label: "Hash blockchain", width: 112 },
      ];
      const totalTableWidth = cols.reduce((s, c) => s + c.width, 0);
      const tableX = margin + (contentWidth - totalTableWidth) / 2;

      doc.rect(tableX, y, totalTableWidth, 16).fill(NAVY);
      let cx = tableX;
      cols.forEach(col => {
        doc.fontSize(7).font("Helvetica-Bold").fillColor(GOLD)
          .text(col.label, cx + 3, y + 4, { width: col.width - 6, align: "center" });
        cx += col.width;
      });
      y += 16;

      // Rows
      entries.forEach((entry: any, idx: number) => {
        const rowH = 28;
        if (y + rowH > pageHeight - 50) {
          doc.addPage({ layout: "landscape" });
          y = 30;
          doc.rect(tableX, y, totalTableWidth, 16).fill(NAVY);
          cx = tableX;
          cols.forEach(col => {
            doc.fontSize(7).font("Helvetica-Bold").fillColor(GOLD)
              .text(col.label, cx + 3, y + 4, { width: col.width - 6, align: "center" });
            cx += col.width;
          });
          y += 16;
        }

        const bg = idx % 2 === 0 ? "#FFFFFF" : LIGHT_GRAY;
        doc.rect(tableX, y, totalTableWidth, rowH).fill(bg);
        doc.rect(tableX, y, totalTableWidth, rowH).lineWidth(0.3).stroke("#DDDDDD");

        cx = tableX;
        const dateFmt = entry.acquisition_date ? new Date(entry.acquisition_date).toLocaleDateString("fr-FR") : "—";
        const seller = entry.seller_type === "physical"
          ? `${(entry.seller_last_name || "").toUpperCase()} ${entry.seller_first_name || ""}`.trim()
          : entry.seller_company_name || "—";
        const prov = entry.seller_address || entry.seller_company_address || "—";
        const price = entry.purchase_price
          ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(entry.purchase_price) : "—";
        const hash = entry.blockchain_hash ? entry.blockchain_hash.substring(0, 16) + "…" : "—";

        [String(idx + 1), dateFmt, String(entry.entry_number || "—"), (entry.description || "—").substring(0, 60),
         prov.substring(0, 40), price, seller.substring(0, 50), hash].forEach((val, i) => {
          doc.fontSize(7).font("Helvetica").fillColor(DARK_GRAY)
            .text(val, cx + 3, y + 4, { width: cols[i].width - 6, lineGap: 1 });
          cx += cols[i].width;
        });
        y += rowH;
      });

      // Footer
      const footerY = pageHeight - 35;
      doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).lineWidth(0.5).stroke(GOLD);
      doc.fontSize(7).font("Helvetica").fillColor(MEDIUM_GRAY)
        .text(`Généré par PASS-CORE le ${dateStr}  |  ROM: ${merchant.numero_rom_prefix}`, margin, footerY + 5, { width: pageWidth - 2 * margin, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
