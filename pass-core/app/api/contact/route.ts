import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TO = process.env.CONTACT_FORWARD_EMAIL || "captainpglg@gmail.com";
const FROM = process.env.SMTP_FROM || process.env.RESEND_FROM_FALLBACK || "PASS-CORE <onboarding@resend.dev>";

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(body.name || "").trim().slice(0, 100);
  const email = String(body.email || "").trim().slice(0, 200);
  const subject = String(body.subject || "Contact PASS-CORE").trim().slice(0, 200);
  const message = String(body.message || "").trim().slice(0, 5000);
  // honeypot
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Message trop court (min 10 caractères)" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY manquant");
    return NextResponse.json({ error: "Service indisponible (config)" }, { status: 503 });
  }

  const html = `
    <h2>Nouveau message contact — PASS-CORE</h2>
    <p><strong>De :</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
    <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
    <hr/>
    <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: `[PASS-CORE] ${subject}`,
        html,
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      console.error("[contact] Resend KO", r.status, t);
      return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[contact] fetch failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
