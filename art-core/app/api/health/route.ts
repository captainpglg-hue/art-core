import { NextRequest, NextResponse } from "next/server";
import { pingDb } from "@/lib/db";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ServiceCheck = { ok: boolean; latencyMs?: number; via?: string; error?: string; skipped?: string; };

async function checkStripe(): Promise<ServiceCheck> {
  if (!isStripeConfigured()) return { ok: false, skipped: "STRIPE_SECRET_KEY missing" };
  const t0 = Date.now();
  try { await stripe.accounts.list({ limit: 1 }); return { ok: true, latencyMs: Date.now() - t0, via: "stripe.accounts.list" }; }
  catch (e) { return { ok: false, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : String(e) }; }
}

async function checkResend(): Promise<ServiceCheck> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: "RESEND_API_KEY missing" };
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) });
    return r.ok ? { ok: true, latencyMs: Date.now() - t0, via: "GET /domains" } : { ok: false, latencyMs: Date.now() - t0, error: `HTTP ${r.status}` };
  } catch (e) { return { ok: false, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : String(e) }; }
}

function redactUrl(url: string | undefined): string | null {
  if (!url) return null;
  try { const u = new URL(url); return `${u.protocol}//${u.hostname}${u.port ? ":" + u.port : ""}${u.pathname}`; }
  catch { return "invalid_url"; }
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const deep = req.nextUrl.searchParams.get("deep") === "1";

  const db = await pingDb();
  const services = deep ? { stripe: await checkStripe(), resend: await checkResend() } : undefined;

  const env = {
    DATABASE_URL: { present: !!process.env.DATABASE_URL, host: redactUrl(process.env.DATABASE_URL) },
    POSTGRES_URL: { present: !!process.env.POSTGRES_URL },
    NEXT_PUBLIC_BASE_URL: { present: !!process.env.NEXT_PUBLIC_BASE_URL },
    SUPABASE_URL: { present: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL },
    SUPABASE_SERVICE_ROLE_KEY: { present: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    RESEND_API_KEY: { present: !!process.env.RESEND_API_KEY },
    STRIPE_SECRET_KEY: { present: !!process.env.STRIPE_SECRET_KEY },
    BLOCKCHAIN_RPC_URL: { present: !!process.env.BLOCKCHAIN_RPC_URL },
  };

  const build = {
    node: process.version,
    platform: process.platform,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelRegion: process.env.VERCEL_REGION ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  };

  const ok = db.ok && (!services || (services.stripe.ok || !!services.stripe.skipped));
  const payload = { ok, app: "art-core", timestamp: new Date().toISOString(), elapsedMs: Date.now() - startedAt, db, ...(services && { services }), env, build };
  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
