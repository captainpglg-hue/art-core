import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// ── Config ──────────────────────────────────────────────────
// In production: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// For local dev: auto-creates an Ethereal test account (preview in browser)
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || (process.env.RESEND_API_KEY ? "onboarding@resend.dev" : "certification@pass-core.art");
const FROM_NAME = process.env.FROM_NAME || "PASS-CORE Certification";

let _transporter: nodemailer.Transporter | null = null;
let _etherealAccount: any = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (_transporter) return _transporter;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    // Custom SMTP (user-provided)
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log(`📧 Using custom SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
  } else if (process.env.RESEND_API_KEY) {
    // Resend via SMTP (API key already configured in Vercel)
    _transporter = nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: process.env.RESEND_API_KEY },
    });
    console.log(`📧 Using Resend SMTP (API key detected)`);
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
  photos?: string[];       // Full URLs to artwork photos
  mainPhoto?: string;      // Full URL to main photo (first photo)
}

const POSITION_LABELS: Record<string, string> = {
  "top-left": "Haut-gauche", "top-center": "Haut-centre", "top-right": "Haut-droite",
  "center-left": "Centre-gauche", "center": "Centre", "center-right": "Centre-droite",
  "bottom-left": "Bas-gauche", "bottom-center": "Bas-centre", "bottom-right": "Bas-droite",
};

export async function sendCertificateEmail(data: CertificateEmailData): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
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
      ${data.photos && data.photos.length > 0 ? `
      <div style="margin-bottom:20px;text-align:center;">
        ${data.mainPhoto || data.photos[0] ? `
        <img src="${data.mainPhoto || data.photos[0]}" alt="${data.artworkTitle}" style="max-width:100%;height:auto;border-radius:12px;border:1px solid rgba(201,168,76,0.2);margin-bottom:12px;" />
        ` : ''}
        ${data.photos.length > 1 ? `
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

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: `"${data.recipientName}" <${data.recipientEmail}>`,
      subject: `Certificat PASS-CORE — ${data.artworkTitle}`,
      text: textContent,
      html,
    });

    // Get preview URL for Ethereal test emails
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      console.log(`📧 Email preview: ${previewUrl}`);
    }

    // Also save email as local HTML file for easy access
    const emailDir = path.join(process.cwd(), "public", "emails");
    fs.mkdirSync(emailDir, { recursive: true });
    const emailFile = path.join(emailDir, `cert_${data.artworkId}.html`);
    fs.writeFileSync(emailFile, html);

    return { success: true, previewUrl: previewUrl as string | undefined };
  } catch (error: any) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
}
