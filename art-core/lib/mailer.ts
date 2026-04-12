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
  const emailDir = path.join(process.cwd(), "public", "emails");
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

  return `/emails/${filename}`;
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
