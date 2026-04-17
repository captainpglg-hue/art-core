// ============================================================================
// /api/health — diagnostic de déploiement (DB, env, blockchain, build)
// ============================================================================
// Usage :  curl https://art-core.app/api/health
// Retourne 200 si tout est OK, 503 si la DB est inaccessible.
// Aucune info sensible n'est exposée (pas de mots de passe, pas d'URL complète).
// ============================================================================

import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";

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

export async function GET() {
  const startedAt = Date.now();

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

  const ok = db.ok;
  const payload = {
    ok,
    app: "art-core",
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    db,
    env,
    build,
  };

  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
