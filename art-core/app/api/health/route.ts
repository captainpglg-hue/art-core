// ============================================================================
// /api/health — diagnostic de déploiement (DB, env, blockchain, build)
// ============================================================================
// Usage :  curl https://art-core.app/api/health           → vérifs locales
//          curl https://art-core.app/api/health?deep=1    → + ping Stripe + Resend
// Retourne 200 si tout est OK, 503 si la DB est inaccessible.
// Aucune info sensible n'est exposée (pas de mots de passe, pas d'URL complète).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { pingDb } from "@/lib/db";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redactUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Masque le mot de passe, ne garde que host + port + database
    return `${u.protocol}//${u.hostname}${u.port ? ":" + u.port : ""}${u.pathname}`;
  } catch {
    return "invalid_url";
  }
}

type PingResult = { ok: boolean; latencyMs: number; via?: string; error?: string };

// Plafond générique pour les pings externes (Stripe, Resend) :
// on n'attend pas plus de 4 s, sinon le health check entier devient inutilisable.
const EXTERNAL_TIMEOUT_MS = 4000;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms),
    ),
  ]);
}

async function pingStripe(): Promise<PingResult> {
  const t0 = Date.now();
  if (!isStripeConfigured()) {
    return { ok: false, latencyMs: 0, error: "not_configured" };
  }
  try {
    // balance.retrieve est l'appel le plus léger qui valide la clé secrète.
    await withTimeout(stripe.balance.retrieve(), EXTERNAL_TIMEOUT_MS, "stripe");
    return { ok: true, latencyMs: Date.now() - t0, via: "balance.retrieve" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, latencyMs: Date.now() - t0, error: msg.slice(0, 200) };
  }
}

async function pingResend(): Promise<PingResult> {
  const t0 = Date.now();
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, latencyMs: 0, error: "not_configured" };
  }
  try {
    // GET /domains : endpoint cheap qui valide juste la clé API.
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), EXTERNAL_TIMEOUT_MS);
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(to);
    if (!r.ok) {
      return { ok: false, latencyMs: Date.now() - t0, error: `HTTP ${r.status}` };
    }
    return { ok: true, latencyMs: Date.now() - t0, via: "GET /domains" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, latencyMs: Date.now() - t0, error: msg.slice(0, 200) };
  }
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";

  // 1. Base de données
  const db = await pingDb();

  // 2. Variables d'environnement critiques (présence seulement, pas de valeur)
  const env = {
    DATABASE_URL: {
      present: !!process.env.DATABASE_URL,
      host: redactUrl(process.env.DATABASE_URL),
    },
    POSTGRES_URL: { present: !!process.env.POSTGRES_URL },
    NEXT_PUBLIC_BASE_URL: { present: !!process.env.NEXT_PUBLIC_BASE_URL },
    SUPABASE_URL: { present: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL },
    SUPABASE_SERVICE_ROLE_KEY: { present: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    RESEND_API_KEY: { present: !!process.env.RESEND_API_KEY },
    STRIPE_SECRET_KEY: { present: !!process.env.STRIPE_SECRET_KEY },
    BLOCKCHAIN_RPC_URL: { present: !!process.env.BLOCKCHAIN_RPC_URL },
  };

  // 3. Build / runtime info
  const build = {
    node: process.version,
    platform: process.platform,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelRegion: process.env.VERCEL_REGION ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  };

  // 4. (Optionnel) Pings externes — uniquement si ?deep=1, pour ne pas peser sur les
  // appels rapides du load balancer Vercel.
  let services: { stripe: PingResult; resend: PingResult } | undefined;
  if (deep) {
    const [stripeRes, resendRes] = await Promise.all([pingStripe(), pingResend()]);
    services = { stripe: stripeRes, resend: resendRes };
  }

  const ok = db.ok;
  const payload = {
    ok,
    app: "art-core",
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    db,
    env,
    build,
    ...(services ? { services } : {}),
  };

  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
