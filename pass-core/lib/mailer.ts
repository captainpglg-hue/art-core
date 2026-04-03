import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// ── Config ──────────────────────────────────────────────────
// Priority: Resend API > SMTP > Ethereal (dev fallback)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
// Clean FROM_EMAIL — strip any embedded name/angle brackets and newlines
function cleanEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().replace(/\n/g, "");
}
const RAW_FROM = process.env.EMAIL_FROM || process.env.FROM_EMAIL || "noreply@art-core.app";
const FROM_EMAIL = cleanEmail(RAW_FROM);
const FROM_NAME = process.env.FROM_NAME || "PASS-CORE Certification";

let _transporter: nodemailer.Transporter | null = null;
let _etherealAccount: any = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (_transporter) return _transporter;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    // Production SMTP
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else {
    // Dev mode: Ethereal fake SMTP (emails visible via URL)
    _etherealAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: _etherealAccount.user, pass: _etherealAccount.pass },
    });
    console.log(`📧 Ethereal test account: ${_etherealAccount.user}`);
  }

  return _transporter;
}

// ── Certificate Email ───────────────────────────────────────
export interface CertificateEmailData {
  recipientEmail: string;
  recipientName: string;
  artworkTitle: string;
  artworkId: string;
  blockchainHash: string;
  txHash: string;
  explorerUrl: string;
  network: string;
  onChain: boolean;
  macroPosition?: string;
  macroQualityScore?: number;
  macroFingerprint?: string;
  certificationDate: string;
  artcoreUrl: string;
  photos?: string[];
  mainPhoto?: string;
}

const POSITION_LABELS: Record<string, string> = {
  "top-left": "Haut-gauche", "top-center": "Haut-centre", "top-right": "Haut-droite",
  "center-left": "Centre-gauche", "center": "Centre", "center-right": "Centre-droite",
  "bottom-left": "Bas-gauche", "bottom-center": "Bas-centre", "bottom-right": "Bas-droite",
};

export async function sendCertificateEmail(data: CertificateEmailData, options?: { cc?: string }): Promise<{ success: boolean; messageId?: string; method?: string; previewUrl?: string; error?: string }> {
  try {
    const transporter = await getTransporter();

    const positionText = data.macroPosition ? POSITION_LABELS[data.macroPosition] || data.macroPosition : "Non spécifiée";
    const explorerLink = data.explorerUrl && data.explorerUrl !== "#"
      ? `<a href="${data.explorerUrl}" style="color: #C9A84C; text-decoration: underline;">Voir sur la blockchain</a>`
      : `<span style="color: #888;">Mode simulation</span>`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="text-align:center;padding:30px 0;border-bottom:1px solid rgba(201,168,76,0.2);">
      <div style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:bold;font-size:14px;padding:8px 20px;border-radius:8px;letter-spacing:2px;">
        PASS-CORE
      </div>
      <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;margin:8px 0 0;text-transform:uppercase;">Authenticate the Real</p>
    </div>

    <!-- Title -->
    <div style="text-align:center;padding:30px 0 20px;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Certificat d'Authenticité</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:14px;margin:0;">Votre oeuvre a été certifiée avec succès</p>
    </div>

    <!-- Certificate Card -->
    <div style="background:#111111;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:24px;margin-bottom:20px;">

      <h2 style="color:#ffffff;font-size:20px;margin:0 0 20px;font-weight:600;">${data.artworkTitle}</h2>

      <!-- Artwork Photos -->
      ${(data.photos && data.photos.length > 0) || data.mainPhoto ? `
      <div style="margin-bottom:20px;text-align:center;">
        ${data.mainPhoto || (data.photos && data.photos[0]) ? `
        <img src="${data.mainPhoto || (data.photos && data.photos[0])}" alt="${data.artworkTitle}" style="max-width:100%;height:auto;border-radius:12px;border:1px solid rgba(201,168,76,0.2);margin-bottom:12px;" />
        ` : ''}
        ${data.photos && data.photos.length > 1 ? `
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          ${data.photos.slice(1).map(photo => `
          <img src="${photo}" alt="${data.artworkTitle}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid rgba(201,168,76,0.15);" />
          `).join('')}
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- Blockchain Hash -->
      <div style="margin-bottom:16px;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Hash Blockchain</p>
        <p style="color:#C9A84C;font-size:12px;font-family:monospace;word-break:break-all;margin:0;background:rgba(201,168,76,0.05);padding:10px;border-radius:8px;border:1px solid rgba(201,168,76,0.1);">
          ${data.blockchainHash}
        </p>
      </div>

      <!-- Transaction -->
      <div style="margin-bottom:16px;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Transaction ID</p>
        <p style="color:rgba(255,255,255,0.5);font-size:11px;font-family:monospace;word-break:break-all;margin:0;">
          ${data.txHash}
        </p>
      </div>

      <!-- Details Grid -->
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Réseau</p>
          <p style="color:#ffffff;font-size:13px;margin:0;">${data.network}</p>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">On-chain</p>
          <p style="color:${data.onChain ? '#22c55e' : '#f59e0b'};font-size:13px;margin:0;font-weight:600;">
            ${data.onChain ? 'Oui' : 'Simulation'}
          </p>
        </div>
      </div>

      <!-- Macro Info -->
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:rgba(201,168,76,0.05);padding:12px;border-radius:8px;border:1px solid rgba(201,168,76,0.1);">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Zone Macro</p>
          <p style="color:#C9A84C;font-size:13px;margin:0;font-weight:600;">${positionText}</p>
        </div>
        ${data.macroQualityScore ? `
        <div style="flex:1;min-width:120px;background:rgba(201,168,76,0.05);padding:12px;border-radius:8px;border:1px solid rgba(201,168,76,0.1);">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Qualité Macro</p>
          <p style="color:${data.macroQualityScore >= 80 ? '#22c55e' : '#f59e0b'};font-size:13px;margin:0;font-weight:600;">${data.macroQualityScore}/100</p>
        </div>` : ''}
      </div>

      ${data.macroFingerprint ? `
      <div style="margin-bottom:16px;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Empreinte Visuelle</p>
        <p style="color:rgba(255,255,255,0.4);font-size:10px;font-family:monospace;word-break:break-all;margin:0;">${data.macroFingerprint}</p>
      </div>` : ''}

      <div style="margin-bottom:0;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Date de certification</p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">${data.certificationDate}</p>
      </div>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${data.artcoreUrl}" style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;margin-bottom:10px;">
        Voir sur ART-CORE
      </a>
    </div>

    ${data.explorerUrl && data.explorerUrl !== "#" ? `
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${data.explorerUrl}" style="display:inline-block;border:1px solid rgba(201,168,76,0.3);color:#C9A84C;font-size:13px;padding:12px 28px;border-radius:12px;text-decoration:none;">
        Vérifier sur la blockchain
      </a>
    </div>` : ''}

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
        Ce certificat a été généré automatiquement par PASS-CORE.<br>
        L'empreinte visuelle et le hash blockchain garantissent l'authenticité de l'oeuvre.
      </p>
      <p style="color:rgba(201,168,76,0.4);font-size:10px;margin:10px 0 0;">
        PASS-CORE — Authenticate the Real | Art-Core Ecosystem
      </p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
PASS-CORE — Certificat d'Authenticité

Oeuvre: ${data.artworkTitle}
Hash Blockchain: ${data.blockchainHash}
Transaction: ${data.txHash}
Réseau: ${data.network} (${data.onChain ? "On-chain" : "Simulation"})
Zone Macro: ${positionText}
${data.macroQualityScore ? `Qualité Macro: ${data.macroQualityScore}/100` : ""}
${data.macroFingerprint ? `Empreinte Visuelle: ${data.macroFingerprint}` : ""}
Date: ${data.certificationDate}

Voir sur ART-CORE: ${data.artcoreUrl}
${data.explorerUrl && data.explorerUrl !== "#" ? `Voir sur la blockchain: ${data.explorerUrl}` : ""}
`;

    // Save email as local HTML file
    try {
      const emailDir = path.join(process.cwd(), "public", "emails");
      fs.mkdirSync(emailDir, { recursive: true });
      const emailFile = path.join(emailDir, `cert_${data.artworkId}.html`);
      fs.writeFileSync(emailFile, html);
    } catch {}

    // ── Send via Resend API (priority) ──────────────────────
    const resendKey = RESEND_API_KEY?.trim();
    console.log("[MAILER] Resend key present:", !!resendKey, "length:", resendKey?.length || 0);

    if (resendKey && resendKey.startsWith("re_") && resendKey.length > 10) {
      // Build email payload
      const emailPayload: any = {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [data.recipientEmail],
        subject: `Certificat PASS-CORE — ${data.artworkTitle}`,
        html,
        text: textContent,
      };

      // Add CC if provided
      if (options?.cc) {
        emailPayload.cc = [options.cc];
      }

      console.log("[MAILER] Sending via Resend to:", data.recipientEmail, "cc:", options?.cc || "none");

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
        });
        const resendResult = await resendRes.json();

        if (resendRes.ok) {
          console.log("[MAILER] ✅ Email envoyé via Resend:", resendResult.id);
          return { success: true, messageId: resendResult.id, method: "resend" };
        } else {
          console.error("[MAILER] ❌ Resend error:", resendRes.status, JSON.stringify(resendResult));

          // If domain not verified, try with onboarding@resend.dev as from
          // Note: onboarding@resend.dev can only send to the Resend account owner
          if (resendResult?.name === "validation_error" || resendResult?.statusCode === 403) {
            const RESEND_OWNER_EMAIL = process.env.RESEND_OWNER_EMAIL || "captainpglg@gmail.com";
            console.log("[MAILER] Retrying with resend.dev fallback, redirecting to:", RESEND_OWNER_EMAIL);
            emailPayload.from = `PASS-CORE <onboarding@resend.dev>`;
            emailPayload.to = [RESEND_OWNER_EMAIL];
            if (RESEND_OWNER_EMAIL !== data.recipientEmail) {
              emailPayload.subject = `[Pour: ${data.recipientEmail}] ${emailPayload.subject}`;
            }
            const retryRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(emailPayload),
            });
            const retryResult = await retryRes.json();
            if (retryRes.ok) {
              console.log("[MAILER] ✅ Email envoyé via Resend (fallback from):", retryResult.id);
              return { success: true, messageId: retryResult.id, method: "resend-fallback" };
            } else {
              console.error("[MAILER] ❌ Resend fallback also failed:", JSON.stringify(retryResult));
            }
          }
          // Fall through to SMTP / Ethereal below
        }
      } catch (resendErr: any) {
        console.error("[MAILER] ❌ Resend fetch error:", resendErr.message);
      }
    } else {
      console.warn("[MAILER] ⚠️ No valid Resend API key (must start with 're_'). Key present:", !!RESEND_API_KEY, "Value starts with:", RESEND_API_KEY?.substring(0, 5) || "N/A");
    }

    // ── Send via SMTP / Ethereal ──────────────────────────────
    const smtpTransporter = await getTransporter();
    const info = await smtpTransporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.recipientEmail,
      cc: options?.cc || undefined,
      subject: `Certificat PASS-CORE — ${data.artworkTitle}`,
      html,
      text: textContent,
    });

    const previewUrl = _etherealAccount ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      console.log("[MAILER] Ethereal preview:", previewUrl);
    }

    return {
      success: true,
      messageId: info.messageId,
      method: _etherealAccount ? "ethereal" : "smtp",
      previewUrl: previewUrl || undefined,
    };
  } catch (error: any) {
    console.error("[MAILER] Error sending certificate email:", error.message);
    return { success: false, error: error.message };
  }
}

// ── Register Email with PDF Attachment ───────────────────
export interface RegisterEmailWithPDFData extends RegisterEmailData {
  pdfBuffer: Buffer;
  pdfFilename: string;
}

export async function sendRegisterEmailWithPDF(
  data: RegisterEmailWithPDFData,
  options?: { cc?: string }
): Promise<{ success: boolean; messageId?: string; method?: string; previewUrl?: string; error?: string }> {
  try {
    const transporter = await getTransporter();

    const priceFormatted = typeof data.purchasePrice === "number"
      ? data.purchasePrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
      : data.purchasePrice;

    const macroSection = data.macroQualityScores && data.macroQualityScores.length > 0
      ? `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        ${data.macroQualityScores.map((score, i) => `
        <div style="flex:1;min-width:80px;background:rgba(201,168,76,0.05);padding:12px;border-radius:8px;border:1px solid rgba(201,168,76,0.1);text-align:center;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Zone ${i + 1}</p>
          <p style="color:${score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444'};font-size:16px;margin:0;font-weight:700;">${score}/100</p>
        </div>`).join("")}
      </div>` : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="text-align:center;padding:30px 0;border-bottom:1px solid rgba(201,168,76,0.2);">
      <div style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:bold;font-size:14px;padding:8px 20px;border-radius:8px;letter-spacing:2px;">
        PASS-CORE
      </div>
      <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;margin:8px 0 0;text-transform:uppercase;">Registre des Objets Mobiliers</p>
    </div>

    <!-- Title -->
    <div style="text-align:center;padding:30px 0 20px;">
      <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px;">Fiche Cahier de Police</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:14px;margin:0;">Entrée n°${data.entryNumber} — ${data.objectNature}</p>
    </div>

    <!-- PDF Notice -->
    <div style="background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:16px;margin-bottom:20px;text-align:center;">
      <p style="color:#C9A84C;font-size:13px;margin:0 0 4px;font-weight:600;">Fiche PDF en pièce jointe</p>
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">Le document officiel du Cahier de Police est joint à cet email au format PDF, prêt à imprimer.</p>
    </div>

    <!-- Entry Card -->
    <div style="background:#111111;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:24px;margin-bottom:20px;">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="color:#ffffff;font-size:18px;margin:0;">Entrée n°${data.entryNumber}</h2>
        <span style="background:rgba(34,197,94,0.1);color:#22c55e;font-size:11px;padding:4px 12px;border-radius:20px;font-weight:600;">SCELLÉ</span>
      </div>

      <!-- Object Info -->
      <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Objet</p>
        <p style="color:#C9A84C;font-size:14px;margin:0 0 4px;font-weight:600;">${data.objectNature}</p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">${data.description}</p>
        ${data.distinctiveSigns ? `<p style="color:rgba(255,255,255,0.4);font-size:12px;margin:8px 0 0;font-style:italic;">Signes : ${data.distinctiveSigns}</p>` : ""}
      </div>

      <!-- Seller & Transaction -->
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Vendeur</p>
          <p style="color:#ffffff;font-size:13px;margin:0;">${data.sellerName}</p>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Prix</p>
          <p style="color:#ffffff;font-size:13px;margin:0;">${priceFormatted}</p>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Règlement</p>
          <p style="color:#ffffff;font-size:13px;margin:0;">${data.paymentMethod}</p>
        </div>
      </div>

      <!-- Macro Quality Scores -->
      ${macroSection}

      <!-- Blockchain -->
      <div style="margin-bottom:12px;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Hash Blockchain (SHA-256)</p>
        <p style="color:#C9A84C;font-size:11px;font-family:monospace;word-break:break-all;margin:0;background:rgba(201,168,76,0.05);padding:10px;border-radius:8px;border:1px solid rgba(201,168,76,0.1);">
          ${data.blockchainHash}
        </p>
      </div>

      <div style="margin-bottom:0;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Date de scellement</p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">${new Date(data.sealedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${data.registreUrl}" style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Voir mon registre
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
        Cet enregistrement est conforme aux obligations de l'article 321-7 du Code pénal.<br>
        Le hash blockchain chaîné garantit l'intégrité et l'horodatage de chaque entrée.
      </p>
      <p style="color:rgba(201,168,76,0.4);font-size:10px;margin:10px 0 0;">
        PASS-CORE — Registre des Objets Mobiliers | Art-Core Ecosystem
      </p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
PASS-CORE — Fiche Cahier de Police
Entrée n°${data.entryNumber} — ${data.objectNature}

Vendeur : ${data.sellerName}
Prix : ${priceFormatted}
Règlement : ${data.paymentMethod}
Hash Blockchain : ${data.blockchainHash}
Date de scellement : ${data.sealedAt}

La fiche PDF officielle est jointe à cet email.
Voir mon registre : ${data.registreUrl}
`;

    const subject = `PASS-CORE — Cahier de Police : Entrée n°${data.entryNumber} — ${data.objectNature}`;

    // ── Send via Resend API with attachment (priority) ──────
    const resendKey = RESEND_API_KEY?.trim();
    if (resendKey && resendKey.startsWith("re_") && resendKey.length > 10) {
      const emailPayload: any = {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [data.recipientEmail],
        subject,
        html,
        text: textContent,
        attachments: [
          {
            filename: data.pdfFilename,
            content: data.pdfBuffer.toString("base64"),
          },
        ],
      };
      if (options?.cc) emailPayload.cc = [options.cc];

      console.log("[MAILER] Sending register email WITH PDF via Resend to:", data.recipientEmail, "cc:", options?.cc || "none");

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
        });
        const resendResult = await resendRes.json();
        if (resendRes.ok) {
          console.log("[MAILER] ✅ Register email + PDF envoyé via Resend:", resendResult.id);
          return { success: true, messageId: resendResult.id, method: "resend" };
        } else {
          console.error("[MAILER] ❌ Resend register+PDF error:", JSON.stringify(resendResult));
          if (resendResult?.name === "validation_error" || resendResult?.statusCode === 403) {
            // onboarding@resend.dev can only send to the Resend account owner's email
            // Redirect to CC address (captainpglg@gmail.com) or keep original if it's the owner
            const ownerEmail = options?.cc || data.recipientEmail;
            console.log("[MAILER] Retrying with resend.dev fallback, redirecting to:", ownerEmail);
            emailPayload.from = `PASS-CORE <onboarding@resend.dev>`;
            emailPayload.to = [ownerEmail];
            delete emailPayload.cc;
            // Add original recipient info in subject if redirected
            if (ownerEmail !== data.recipientEmail) {
              emailPayload.subject = `[Pour: ${data.recipientEmail}] ${emailPayload.subject}`;
            }
            const retryRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(emailPayload),
            });
            const retryResult = await retryRes.json();
            if (retryRes.ok) {
              console.log("[MAILER] ✅ Register email + PDF envoyé via Resend (fallback):", retryResult.id);
              return { success: true, messageId: retryResult.id, method: "resend-fallback" };
            } else {
              console.error("[MAILER] ❌ Resend fallback also failed:", JSON.stringify(retryResult));
            }
          }
        }
      } catch (resendErr: any) {
        console.error("[MAILER] Resend register+PDF fetch error:", resendErr.message);
      }
    }

    // ── Fallback SMTP / Ethereal with attachment ──────────────
    const smtpTransporter = await getTransporter();
    const info = await smtpTransporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.recipientEmail,
      cc: options?.cc || undefined,
      subject,
      html,
      text: textContent,
      attachments: [
        {
          filename: data.pdfFilename,
          content: data.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    const previewUrl = _etherealAccount ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) console.log("[MAILER] Ethereal register+PDF preview:", previewUrl);

    return {
      success: true,
      messageId: info.messageId,
      method: _etherealAccount ? "ethereal" : "smtp",
      previewUrl: previewUrl || undefined,
    };
  } catch (error: any) {
    console.error("[MAILER] Error sending register email with PDF:", error.message);
    return { success: false, error: error.message };
  }
}

// ── Register (Cahier de Police) Email ──────────────────────
export interface RegisterEmailData {
  recipientEmail: string;
  recipientName: string;
  entryNumber: number;
  objectNature: string;
  description: string;
  distinctiveSigns?: string;
  purchasePrice: number | string;
  paymentMethod: string;
  sellerName: string;
  blockchainHash: string;
  previousHash: string;
  sealedAt: string;
  macroQualityScores?: number[];
  registreUrl: string;
}

export async function sendRegisterEmail(
  data: RegisterEmailData,
  options?: { cc?: string }
): Promise<{ success: boolean; messageId?: string; method?: string; previewUrl?: string; error?: string }> {
  try {
    const transporter = await getTransporter();

    const priceFormatted = typeof data.purchasePrice === "number"
      ? data.purchasePrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
      : data.purchasePrice;

    const macroSection = data.macroQualityScores && data.macroQualityScores.length > 0
      ? `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        ${data.macroQualityScores.map((score, i) => `
        <div style="flex:1;min-width:80px;background:rgba(201,168,76,0.05);padding:12px;border-radius:8px;border:1px solid rgba(201,168,76,0.1);text-align:center;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Zone ${i + 1}</p>
          <p style="color:${score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444'};font-size:16px;margin:0;font-weight:700;">${score}/100</p>
        </div>`).join("")}
      </div>` : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="text-align:center;padding:30px 0;border-bottom:1px solid rgba(201,168,76,0.2);">
      <div style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:bold;font-size:14px;padding:8px 20px;border-radius:8px;letter-spacing:2px;">
        PASS-CORE
      </div>
      <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;margin:8px 0 0;text-transform:uppercase;">Registre des Objets Mobiliers</p>
    </div>

    <!-- Title -->
    <div style="text-align:center;padding:30px 0 20px;">
      <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px;">Confirmation d'enregistrement</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:14px;margin:0;">Cahier de police — art. 321-7 du Code p\u00e9nal</p>
    </div>

    <!-- Entry Card -->
    <div style="background:#111111;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:24px;margin-bottom:20px;">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="color:#ffffff;font-size:18px;margin:0;">Entr\u00e9e n\u00b0${data.entryNumber}</h2>
        <span style="background:rgba(34,197,94,0.1);color:#22c55e;font-size:11px;padding:4px 12px;border-radius:20px;font-weight:600;">SCELL\u00c9</span>
      </div>

      <!-- Object Info -->
      <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Objet</p>
        <p style="color:#C9A84C;font-size:14px;margin:0 0 4px;font-weight:600;">${data.objectNature}</p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">${data.description}</p>
        ${data.distinctiveSigns ? `<p style="color:rgba(255,255,255,0.4);font-size:12px;margin:8px 0 0;font-style:italic;">Signes : ${data.distinctiveSigns}</p>` : ""}
      </div>

      <!-- Seller & Transaction -->
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Vendeur</p>
          <p style="color:#ffffff;font-size:13px;margin:0;">${data.sellerName}</p>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Prix</p>
          <p style="color:#ffffff;font-size:13px;margin:0;">${priceFormatted}</p>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">R\u00e8glement</p>
          <p style="color:#ffffff;font-size:13px;margin:0;">${data.paymentMethod}</p>
        </div>
      </div>

      <!-- Macro Quality Scores -->
      ${macroSection}

      <!-- Blockchain -->
      <div style="margin-bottom:12px;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Hash Blockchain (SHA-256)</p>
        <p style="color:#C9A84C;font-size:11px;font-family:monospace;word-break:break-all;margin:0;background:rgba(201,168,76,0.05);padding:10px;border-radius:8px;border:1px solid rgba(201,168,76,0.1);">
          ${data.blockchainHash}
        </p>
      </div>

      <div style="margin-bottom:0;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Date de scellement</p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">${new Date(data.sealedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${data.registreUrl}" style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Voir mon registre
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
        Cet enregistrement est conforme aux obligations de l'article 321-7 du Code p\u00e9nal.<br>
        Le hash blockchain cha\u00een\u00e9 garantit l'int\u00e9grit\u00e9 et l'horodatage de chaque entr\u00e9e.
      </p>
      <p style="color:rgba(201,168,76,0.4);font-size:10px;margin:10px 0 0;">
        PASS-CORE — Registre des Objets Mobiliers | Art-Core Ecosystem
      </p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
PASS-CORE — Registre des Objets Mobiliers
Confirmation d'enregistrement — Cahier de police (art. 321-7 CP)

Entr\u00e9e n\u00b0${data.entryNumber}
Objet : ${data.objectNature}
Description : ${data.description}
${data.distinctiveSigns ? `Signes distinctifs : ${data.distinctiveSigns}` : ""}
Vendeur : ${data.sellerName}
Prix : ${priceFormatted}
R\u00e8glement : ${data.paymentMethod}
${data.macroQualityScores ? `Scores macro : ${data.macroQualityScores.map((s, i) => `Zone ${i + 1}: ${s}/100`).join(", ")}` : ""}
Hash Blockchain : ${data.blockchainHash}
Date de scellement : ${data.sealedAt}

Voir mon registre : ${data.registreUrl}
`;

    const subject = `Registre PASS-CORE — Entr\u00e9e n\u00b0${data.entryNumber} : ${data.objectNature}`;

    // ── Send via Resend API (priority) ──────────────────────
    const resendKey = RESEND_API_KEY?.trim();
    if (resendKey && resendKey.startsWith("re_") && resendKey.length > 10) {
      const emailPayload: any = {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [data.recipientEmail],
        subject,
        html,
        text: textContent,
      };
      if (options?.cc) emailPayload.cc = [options.cc];

      console.log("[MAILER] Sending register email via Resend to:", data.recipientEmail, "cc:", options?.cc || "none");

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
        });
        const resendResult = await resendRes.json();
        if (resendRes.ok) {
          console.log("[MAILER] \u2705 Register email envoy\u00e9 via Resend:", resendResult.id);
          return { success: true, messageId: resendResult.id, method: "resend" };
        } else {
          console.error("[MAILER] \u274c Resend register error:", JSON.stringify(resendResult));
          if (resendResult?.name === "validation_error" || resendResult?.statusCode === 403) {
            const ownerEmail = options?.cc || data.recipientEmail;
            console.log("[MAILER] Retrying register email with resend.dev fallback, redirecting to:", ownerEmail);
            emailPayload.from = `PASS-CORE <onboarding@resend.dev>`;
            emailPayload.to = [ownerEmail];
            delete emailPayload.cc;
            if (ownerEmail !== data.recipientEmail) {
              emailPayload.subject = `[Pour: ${data.recipientEmail}] ${emailPayload.subject}`;
            }
            const retryRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(emailPayload),
            });
            const retryResult = await retryRes.json();
            if (retryRes.ok) {
              console.log("[MAILER] ✅ Register email envoyé via Resend (fallback):", retryResult.id);
              return { success: true, messageId: retryResult.id, method: "resend-fallback" };
            } else {
              console.error("[MAILER] ❌ Resend register fallback also failed:", JSON.stringify(retryResult));
            }
          }
        }
      } catch (resendErr: any) {
        console.error("[MAILER] Resend register fetch error:", resendErr.message);
      }
    }

    // ── Fallback SMTP / Ethereal ──────────────────────────────
    const smtpTransporter = await getTransporter();
    const info = await smtpTransporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.recipientEmail,
      cc: options?.cc || undefined,
      subject,
      html,
      text: textContent,
    });

    const previewUrl = _etherealAccount ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) console.log("[MAILER] Ethereal register preview:", previewUrl);

    return {
      success: true,
      messageId: info.messageId,
      method: _etherealAccount ? "ethereal" : "smtp",
      previewUrl: previewUrl || undefined,
    };
  } catch (error: any) {
    console.error("[MAILER] Error sending register email:", error.message);
    return { success: false, error: error.message };
  }
}