import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// ── Email System ────────────────────────────────────────────
// Priority: 1) Gmail SMTP  2) Resend  3) Local-only (saves HTML files)
// In ALL modes, emails are saved locally at /public/emails/ for viewing

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_FROM || "certification@pass-core.art";
const FROM_NAME = process.env.FROM_NAME || "PASS-CORE Certification";

let transporter: nodemailer.Transporter | null = null;
let _mode: "smtp" | "resend" | "local" = "local";

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  if (transporter) return transporter;

  // Try SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_PASS !== "COLLE_TON_MOT_DE_PASSE_APP_ICI") {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      _mode = "smtp";
      console.log(`📧 Email: SMTP (${process.env.SMTP_HOST})`);
      return transporter;
    } catch (e) {
      console.warn("📧 SMTP config failed, falling back to local mode");
    }
  }

  // Try Resend
  if (process.env.RESEND_API_KEY) {
    try {
      transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: process.env.RESEND_API_KEY },
      });
      _mode = "resend";
      console.log("📧 Email: Resend SMTP");
      return transporter;
    } catch (e) {
      console.warn("📧 Resend config failed, falling back to local mode");
    }
  }

  // Local mode — no external service needed
  _mode = "local";
  console.log("📧 Email: Mode local (emails sauvegardés dans /public/emails/)");
  return null;
}

function saveEmailLocally(filename: string, html: string, metadata: {
  to: string;
  subject: string;
  from: string;
  date: string;
}): string {
  const emailDir = path.join(process.cwd(), "public", "emails");
  fs.mkdirSync(emailDir, { recursive: true });

  const filepath = path.join(emailDir, filename);
  fs.writeFileSync(filepath, html, "utf-8");

  // Update email index
  const indexPath = path.join(emailDir, "index.json");
  let index: any[] = [];
  try {
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    }
  } catch {}

  index.unshift({
    filename,
    ...metadata,
    mode: _mode,
  });

  if (index.length > 100) index = index.slice(0, 100);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf-8");

  return `/emails/${filename}`;
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

export async function sendAdminCode(
  email: string,
  name: string,
  code: string
): Promise<{ success: boolean; code: string; localUrl: string }> {
  const trans = await getTransporter();

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0A1128;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:rgba(20,25,45,0.9);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:40px;text-align:center;">
      <div style="margin-bottom:30px;">
        <div style="font-size:28px;font-weight:bold;color:#D4AF37;margin-bottom:10px;">CORE ECOSYSTEM</div>
        <p style="font-size:14px;color:rgba(255,255,255,0.5);margin:0;">Administration PASS-CORE</p>
      </div>
      <div style="margin:30px 0;font-size:18px;color:#fff;line-height:1.6;">
        Bonjour ${name},
      </div>
      <p style="color:rgba(255,255,255,0.7);margin-bottom:30px;">
        Veuillez utiliser le code ci-dessous pour accéder au panneau d'administration.
      </p>
      <div style="margin:40px 0;padding:30px;background:#0A1128;border-radius:8px;border:2px dashed #D4AF37;">
        <div style="font-size:12px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:2px;margin-bottom:15px;">Code de vérification</div>
        <div style="font-size:48px;font-weight:bold;color:#D4AF37;letter-spacing:12px;font-family:'Courier New',monospace;margin:0;">${code}</div>
        <div style="margin-top:20px;font-size:14px;color:#D4AF37;font-weight:600;">Ce code expire dans 10 minutes</div>
      </div>
      <div style="margin-top:20px;padding:15px;background:rgba(212,175,55,0.1);border-left:3px solid #D4AF37;border-radius:4px;text-align:left;font-size:13px;color:rgba(255,255,255,0.7);">
        <strong>Securite</strong><br>
        Ne partagez jamais ce code avec quiconque.
      </div>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.3);">
        <p style="margin:10px 0;">PASS-CORE — Core Ecosystem. Tous droits reserves.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const now = new Date();
  const filename = `admin_code_${now.getTime()}.html`;

  // ALWAYS save locally
  const localUrl = saveEmailLocally(filename, htmlContent, {
    to: email,
    subject: "Code d'authentification administrateur PASS-CORE",
    from: FROM_EMAIL,
    date: now.toISOString(),
  });

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📧 CODE ADMIN OTP pour ${name} (${email})`);
  console.log(`   CODE: ${code}`);
  console.log(`   Email sauvegardé: ${localUrl}`);
  console.log(`${"=".repeat(50)}\n`);

  // Try to also send via SMTP if configured
  if (trans) {
    try {
      await trans.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: `"${name}" <${email}>`,
        subject: "Code d'authentification administrateur PASS-CORE",
        html: htmlContent,
      });
      console.log(`📧 Email SMTP envoyé avec succès à ${email}`);
    } catch (error: any) {
      console.warn(`📧 Envoi SMTP échoué (${error.message}), email sauvegardé localement`);
    }
  }

  return { success: true, code, localUrl };
}

export async function sendCertificateEmail(data: CertificateEmailData): Promise<{ success: boolean; localUrl: string }> {
  const trans = await getTransporter();

  const positionText = data.macroPosition ? POSITION_LABELS[data.macroPosition] || data.macroPosition : "Non spécifiée";

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="text-align:center;padding:30px 0;border-bottom:1px solid rgba(201,168,76,0.2);">
      <div style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:bold;font-size:14px;padding:8px 20px;border-radius:8px;letter-spacing:2px;">
        PASS-CORE
      </div>
      <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;margin:8px 0 0;text-transform:uppercase;">Authenticate the Real</p>
    </div>
    <div style="text-align:center;padding:30px 0 20px;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Certificat d'Authenticité</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:14px;margin:0;">Votre oeuvre a été certifiée avec succès</p>
    </div>
    <div style="background:#111111;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:24px;margin-bottom:20px;">
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 20px;font-weight:600;">${data.artworkTitle}</h2>
      ${data.photos && data.photos.length > 0 ? `
      <div style="margin-bottom:20px;text-align:center;">
        ${data.mainPhoto || data.photos[0] ? `
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Vue principale</p>
        <img src="${data.mainPhoto || data.photos[0]}" alt="${data.artworkTitle}" style="max-width:100%;height:auto;border-radius:12px;border:1px solid rgba(201,168,76,0.2);margin-bottom:16px;" />
        ` : ''}
        ${data.photos.length > 1 ? `
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Photos macro (${data.photos.length - 1})</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:12px;">
          ${data.photos.slice(1).map((url: string, i: number) => `
          <img src="${url}" alt="Macro ${i + 1}" style="width:30%;min-width:120px;height:auto;border-radius:8px;border:1px solid rgba(201,168,76,0.15);" />
          `).join('')}
        </div>
        ` : ''}
      </div>
      ` : ''}
      <div style="margin-bottom:16px;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Hash Blockchain</p>
        <p style="color:#C9A84C;font-size:12px;font-family:monospace;word-break:break-all;margin:0;background:rgba(201,168,76,0.05);padding:10px;border-radius:8px;border:1px solid rgba(201,168,76,0.1);">
          ${data.blockchainHash}
        </p>
      </div>
      <div style="margin-bottom:16px;">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Transaction ID</p>
        <p style="color:rgba(255,255,255,0.5);font-size:11px;font-family:monospace;word-break:break-all;margin:0;">${data.txHash}</p>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">Réseau</p>
          <p style="color:#ffffff;font-size:13px;margin:0;">${data.network}</p>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;">
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;margin:0 0 4px;">On-chain</p>
          <p style="color:${data.onChain ? '#22c55e' : '#f59e0b'};font-size:13px;margin:0;font-weight:600;">${data.onChain ? 'Oui' : 'Simulation'}</p>
        </div>
      </div>
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
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${data.artcoreUrl}" style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">Voir sur ART-CORE</a>
    </div>
    ${data.explorerUrl && data.explorerUrl !== "#" ? `
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${data.explorerUrl}" style="display:inline-block;border:1px solid rgba(201,168,76,0.3);color:#C9A84C;font-size:13px;padding:12px 28px;border-radius:12px;text-decoration:none;">Vérifier sur la blockchain</a>
    </div>` : ''}
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

  const now = new Date();
  const filename = `cert_${data.artworkId}_${now.getTime()}.html`;

  // ALWAYS save locally
  const localUrl = saveEmailLocally(filename, htmlContent, {
    to: data.recipientEmail,
    subject: `Certificat PASS-CORE — ${data.artworkTitle}`,
    from: FROM_EMAIL,
    date: now.toISOString(),
  });

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📧 CERTIFICAT pour ${data.recipientName} (${data.recipientEmail})`);
  console.log(`   Oeuvre: ${data.artworkTitle}`);
  console.log(`   Hash: ${data.blockchainHash}`);
  console.log(`   Email sauvegardé: ${localUrl}`);
  console.log(`${"=".repeat(50)}\n`);

  // Try to also send via SMTP if configured
  if (trans) {
    try {
      await trans.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: `"${data.recipientName}" <${data.recipientEmail}>`,
        subject: `Certificat PASS-CORE — ${data.artworkTitle}`,
        html: htmlContent,
      });
      console.log(`📧 Email SMTP envoyé avec succès à ${data.recipientEmail}`);
    } catch (error: any) {
      console.warn(`📧 Envoi SMTP échoué (${error.message}), email sauvegardé localement`);
    }
  }

  return { success: true, localUrl };
}
