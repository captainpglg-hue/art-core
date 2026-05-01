import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// ── Email System ────────────────────────────────────────────
// Priority: 1) Gmail SMTP  2) Resend  3) Local-only (saves HTML files)
// In ALL modes, emails are saved locally at /public/emails/ for viewing

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
  // On Vercel, use /tmp (ephemeral but writable). Locally, use public/emails/
  const IS_VERCEL = !!process.env.VERCEL;
  const emailDir = IS_VERCEL
    ? path.join("/tmp", "emails")
    : path.join(process.cwd(), "public", "emails");

  try {
    fs.mkdirSync(emailDir, { recursive: true });

    // Save the HTML email
    const filepath = path.join(emailDir, filename);
    fs.writeFileSync(filepath, html, "utf-8");

    // Update the email index
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

    // Keep last 100 emails
    if (index.length > 100) index = index.slice(0, 100);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf-8");
  } catch (err: any) {
    console.warn(`Could not save email locally: ${err.message}`);
  }

  return IS_VERCEL ? `/tmp/emails/${filename}` : `/emails/${filename}`;
}

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
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1a1a1a;border:1px solid #D4AF37;border-radius:12px;padding:40px;text-align:center;">
      <div style="margin-bottom:30px;">
        <div style="font-size:28px;font-weight:bold;color:#D4AF37;margin-bottom:10px;">CORE ECOSYSTEM</div>
        <p style="font-size:14px;color:#999;margin:0;">Authentification Administrateur</p>
      </div>
      <div style="margin:30px 0;font-size:18px;color:#fff;line-height:1.6;">
        Bonjour ${name},
      </div>
      <p style="color:#ccc;margin-bottom:30px;">
        Veuillez utiliser le code ci-dessous pour accéder au panneau d'administration.
      </p>
      <div style="margin:40px 0;padding:30px;background:#0a0a0a;border-radius:8px;border:2px dashed #D4AF37;">
        <div style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:15px;">Code de vérification</div>
        <div style="font-size:48px;font-weight:bold;color:#D4AF37;letter-spacing:12px;font-family:'Courier New',monospace;margin:0;">${code}</div>
        <div style="margin-top:20px;font-size:14px;color:#D4AF37;font-weight:600;">Ce code expire dans 10 minutes</div>
      </div>
      <div style="margin-top:20px;padding:15px;background:rgba(212,175,55,0.1);border-left:3px solid #D4AF37;border-radius:4px;text-align:left;font-size:13px;color:#ccc;">
        <strong>Securite</strong><br>
        Ne partagez jamais ce code avec quiconque.
      </div>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #333;font-size:12px;color:#666;">
        <p style="margin:10px 0;">Core Ecosystem. Tous droits reserves.</p>
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
    subject: "Code d'authentification administrateur CORE",
    from: process.env.SMTP_FROM || "noreply@core-ecosystem.art",
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
        from: process.env.SMTP_FROM || "noreply@core-ecosystem.art",
        to: email,
        subject: "Code d'authentification administrateur CORE",
        html: htmlContent,
      });
      console.log(`📧 Email SMTP envoyé avec succès à ${email}`);
    } catch (error: any) {
      console.warn(`📧 Envoi SMTP échoué (${error.message}), email sauvegardé localement`);
    }
  }

  return { success: true, code, localUrl };
}

// ── Certificate Email ─────────────────────────────────────
interface CertificateEmailParams {
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

export async function sendCertificateEmail(
  params: CertificateEmailParams
): Promise<{ success: boolean; previewUrl?: string }> {
  const trans = await getTransporter();

  const mainPhotoHtml = params.mainPhoto
    ? `<div style="margin:20px 0;text-align:center;"><img src="${params.mainPhoto}" alt="${params.artworkTitle}" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #333;" /></div>`
    : "";

  const chainInfo = params.onChain
    ? `<a href="${params.explorerUrl}" style="color:#D4AF37;text-decoration:underline;">Voir sur ${params.network}</a>`
    : `<span style="color:#999;">Simulation (${params.network})</span>`;

  const macroInfo = params.macroFingerprint
    ? `<div style="margin:15px 0;padding:10px;background:#0a0a0a;border-radius:6px;font-size:12px;color:#999;">
        <div>Zone macro : ${params.macroPosition || "N/A"}</div>
        <div>Score qualite : ${params.macroQualityScore || 0}/100</div>
        <div style="word-break:break-all;">Empreinte : ${params.macroFingerprint.slice(0, 32)}...</div>
      </div>`
    : "";

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1a1a1a;border:1px solid #D4AF37;border-radius:12px;padding:40px;text-align:center;">
      <div style="font-size:28px;font-weight:bold;color:#D4AF37;margin-bottom:5px;">ART-CORE</div>
      <p style="font-size:14px;color:#999;margin:0 0 30px;">Certificat d'Authenticite</p>
      ${mainPhotoHtml}
      <div style="font-size:20px;color:#fff;margin:20px 0;font-weight:600;">${params.artworkTitle}</div>
      <p style="color:#ccc;">Certifie le ${params.certificationDate}</p>
      <div style="margin:30px 0;padding:20px;background:#0a0a0a;border-radius:8px;border:1px solid #333;text-align:left;">
        <div style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Blockchain</div>
        <div style="font-size:13px;color:#D4AF37;word-break:break-all;margin-bottom:8px;">${params.blockchainHash}</div>
        <div style="font-size:12px;">${chainInfo}</div>
      </div>
      ${macroInfo}
      <a href="${params.artcoreUrl}" style="display:inline-block;margin-top:20px;padding:12px 30px;background:#D4AF37;color:#0a0a0a;text-decoration:none;border-radius:6px;font-weight:600;">Voir sur ART-CORE</a>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #333;font-size:12px;color:#666;">
        <p>ART-CORE GROUP LTD — art-core.app</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const filename = `cert_${params.artworkId}.html`;
  const localUrl = saveEmailLocally(filename, htmlContent, {
    to: params.recipientEmail,
    subject: `Certificat ART-CORE : ${params.artworkTitle}`,
    from: process.env.SMTP_FROM || "noreply@art-core.app",
    date: new Date().toISOString(),
  });

  // Try to send via SMTP if configured
  if (trans) {
    try {
      await trans.sendMail({
        from: process.env.SMTP_FROM || "noreply@art-core.app",
        to: params.recipientEmail,
        subject: `Certificat d'authenticite ART-CORE : ${params.artworkTitle}`,
        html: htmlContent,
      });
      console.log(`📧 Certificate email sent to ${params.recipientEmail}`);
    } catch (error: any) {
      console.warn(`📧 Certificate email failed (${error.message}), saved locally`);
    }
  }

  return { success: true, previewUrl: localUrl };
}

// ── Magic Link Email ─────────────────────────────────────
interface MagicLinkEmailParams {
  to: string;
  recipientName?: string;
  verifyUrl: string;
  intent: "login" | "signup";
}

export async function sendMagicLinkEmail(
  params: MagicLinkEmailParams
): Promise<{ success: boolean; error?: string; previewUrl?: string }> {
  const trans = await getTransporter();

  const greeting = params.recipientName
    ? `Bonjour ${params.recipientName},`
    : "Bonjour,";

  const action = params.intent === "signup"
    ? "Bienvenue sur ART-CORE. Cliquez sur le bouton ci-dessous pour finaliser votre inscription :"
    : "Cliquez sur le bouton ci-dessous pour vous connecter à votre compte ART-CORE :";

  const subject = params.intent === "signup"
    ? "Bienvenue — finalisez votre inscription ART-CORE"
    : "Votre lien de connexion ART-CORE";

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1a1a1a;border:1px solid #D4AF37;border-radius:12px;padding:40px;">
      <div style="text-align:center;margin-bottom:30px;">
        <div style="font-size:28px;font-weight:bold;color:#D4AF37;margin-bottom:10px;">ART-CORE</div>
        <p style="font-size:14px;color:#999;margin:0;">Marketplace d'art certifie</p>
      </div>
      <div style="font-size:18px;color:#fff;line-height:1.6;margin-bottom:20px;">${greeting}</div>
      <p style="color:#ccc;line-height:1.6;margin-bottom:30px;">${action}</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${params.verifyUrl}" style="display:inline-block;padding:14px 32px;background:#D4AF37;color:#0a0a0a;font-weight:600;text-decoration:none;border-radius:8px;">Acceder a mon compte</a>
      </div>
      <p style="color:#888;font-size:12px;line-height:1.6;margin-top:30px;">
        Ce lien est valable 15 minutes. Si vous n'avez pas demande cette connexion, ignorez ce message.
      </p>
      <div style="border-top:1px solid #333;margin-top:30px;padding-top:20px;text-align:center;">
        <p style="color:#666;font-size:11px;margin:0;">Lien direct (au cas ou le bouton ne marche pas) :</p>
        <p style="color:#999;font-size:11px;word-break:break-all;margin:6px 0 0;">${params.verifyUrl}</p>
      </div>
    </div>
    <p style="text-align:center;color:#555;font-size:11px;margin-top:20px;">ART-CORE &middot; Authenticate the Real</p>
  </div>
</body>
</html>`;

  const textContent = `${greeting}\n\n${action}\n\n${params.verifyUrl}\n\nLien valable 15 minutes. Ignorez si vous n'avez pas demande cette connexion.`;

  const localUrl = saveEmailLocally(`magic-link-${Date.now()}.html`, htmlContent, {
    to: params.to,
    subject,
    from: process.env.SMTP_FROM || "noreply@art-core.app",
    date: new Date().toISOString(),
  });

  if (trans) {
    try {
      await trans.sendMail({
        from: process.env.SMTP_FROM || "noreply@art-core.app",
        to: params.to,
        subject,
        html: htmlContent,
        text: textContent,
      });
      return { success: true, previewUrl: localUrl };
    } catch (error: any) {
      console.error(`[mailer] magic-link SMTP failed: ${error.message}`);
      return { success: false, error: error.message, previewUrl: localUrl };
    }
  }

  // Pas de transport configure : on log mais on echoue (pas d'auth possible)
  console.error("[mailer] no transport configured for magic-link email");
  return { success: false, error: "no_email_transport_configured", previewUrl: localUrl };
}
