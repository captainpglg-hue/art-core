// ============================================================
// APPLY-SQL-FIX.mjs - execute TOUT le SQL de la session
// Essaie plusieurs URL de connexion en sequence
// Usage : cd art-core && node APPLY-SQL-FIX.mjs
// ============================================================

import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "kmmlwuwsahtzgzztcdaj";
const PW_PLAIN = "PhilippeGLG19021970!!!";

// ── Lit DATABASE_URL depuis les .env.local ─────────────────
function loadDatabaseUrl() {
  const candidates = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, ".env.local"),
  ];
  for (const f of candidates) {
    if (!fs.existsSync(f)) continue;
    const content = fs.readFileSync(f, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*["']?(.+?)["']?\s*$/);
      if (m) {
        console.log(`[apply-sql] DATABASE_URL from: ${f}`);
        return m[1];
      }
    }
  }
  return null;
}

function parseUrl(url) {
  const ipv6Match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@\[([0-9a-f:]+)\]:(\d+)\/(.+)$/i);
  const plainMatch = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/(.+)$/i);
  const m = ipv6Match || plainMatch;
  if (!m) return null;
  const [, user, pw, host, port, db] = m;
  return {
    host,
    port: Number(port),
    database: db,
    username: user,
    password: decodeURIComponent(pw),
  };
}

// ── Candidate connections (try all) ────────────────────────
const envDbUrl = process.env.DATABASE_URL || loadDatabaseUrl();
const candidates = [];
if (envDbUrl) {
  const p = parseUrl(envDbUrl);
  if (p) candidates.push({ name: "env DATABASE_URL", cfg: p });
}
// Direct hostname (DNS IPv4)
candidates.push({
  name: "db.supabase.co direct",
  cfg: {
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    username: "postgres",
    password: PW_PLAIN,
  },
});
// Pooler session mode aws-0
candidates.push({
  name: "pooler aws-0 5432",
  cfg: {
    host: "aws-0-eu-west-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    username: `postgres.${PROJECT_REF}`,
    password: PW_PLAIN,
  },
});
// Pooler transaction mode aws-0
candidates.push({
  name: "pooler aws-0 6543",
  cfg: {
    host: "aws-0-eu-west-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    username: `postgres.${PROJECT_REF}`,
    password: PW_PLAIN,
  },
});
// aws-1 fallback
candidates.push({
  name: "pooler aws-1 5432",
  cfg: {
    host: "aws-1-eu-west-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    username: `postgres.${PROJECT_REF}`,
    password: PW_PLAIN,
  },
});

// ── SQL ────────────────────────────────────────────────────
const sqlText = `
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS macro_fingerprint TEXT;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS p_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_artworks_p_hash ON public.artworks (p_hash) WHERE p_hash IS NOT NULL;
`;

async function tryConnect(cand) {
  const sql = postgres({
    ...cand.cfg,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const r = await sql`SELECT 1 AS ok`;
    console.log(`[apply-sql] OK via ${cand.name} (host=${cand.cfg.host}:${cand.cfg.port})`);
    return sql;
  } catch (e) {
    console.log(`[apply-sql] FAIL ${cand.name}: ${e.message.slice(0, 120)}`);
    await sql.end({ timeout: 2 }).catch(() => {});
    return null;
  }
}

async function main() {
  let sql = null;
  for (const c of candidates) {
    sql = await tryConnect(c);
    if (sql) break;
  }
  if (!sql) {
    console.error("\n[apply-sql] AUCUNE connexion n'a fonctionne.");
    console.error("[apply-sql] Va manuellement sur :");
    console.error(`  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
    console.error("[apply-sql] et colle le SQL suivant :");
    console.error(sqlText);
    process.exit(2);
  }

  try {
    console.log("\n[apply-sql] execution du SQL...");
    await sql.unsafe(sqlText);
    console.log("[apply-sql] OK.");

    const after = await sql`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.users'::regclass
      ORDER BY conname
    `;
    const fkGone = !after.some((c) => c.conname === "users_id_fkey");
    console.log(`[apply-sql] users_id_fkey supprimee : ${fkGone ? "OUI" : "NON"}`);

    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='artworks'
        AND column_name IN ('p_hash','macro_fingerprint')
      ORDER BY column_name
    `;
    console.log(`[apply-sql] colonnes artworks : ${cols.map((c) => c.column_name).join(", ") || "(aucune)"}`);

    if (fkGone && cols.length === 2) {
      console.log("\n[apply-sql] SUCCESS complet.");
      process.exit(0);
    } else {
      console.warn("\n[apply-sql] Partiel.");
      process.exit(1);
    }
  } catch (e) {
    console.error("[apply-sql] ERREUR:", e.message);
    process.exit(3);
  } finally {
    await sql.end({ timeout: 3 }).catch(() => {});
  }
}

main();
