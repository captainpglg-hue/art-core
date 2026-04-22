#!/usr/bin/env node
// ============================================================
// ART-CORE — SQL Executor via Supabase Management API
// Tries Management API first, then falls back to pg if URL is set.
// ============================================================

require("dotenv").config({ path: ".env.local" });
const fs   = require("fs");
const path = require("path");

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DATABASE_URL     = process.env.DATABASE_URL ?? "";

// Extract project ref from URL: https://XXXXXX.supabase.co
const PROJECT_REF = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";

const MIGRATION_FILE = path.join(__dirname, "..", "supabase", "migrations", "001_initial_schema.sql");

const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

function splitStatements(sql) {
  // Handle DO $$ ... $$ blocks as single statements
  const statements = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";
  const lines = sql.split("\n");

  for (const line of lines) {
    const stripped = line.replace(/--.*$/, "").trim();
    current += line + "\n";

    // Track $$ dollar quoting
    const dollarMatches = stripped.match(/\$\$/g);
    if (dollarMatches) {
      inDollarQuote = !inDollarQuote;
    }

    if (!inDollarQuote && stripped.endsWith(";")) {
      const stmt = current.trim().replace(/;$/, "").trim();
      if (stmt.length > 5) statements.push(stmt);
      current = "";
    }
  }

  if (current.trim().length > 5) statements.push(current.trim());
  return statements;
}

// ── Method 1: Supabase Management API ────────────────────────
async function tryManagementAPI(sql) {
  console.log(c.cyan("  → Trying Supabase Management API…"));

  // The management API needs a personal access token, but let's try
  // with the service role key — some endpoints accept it
  const endpoints = [
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    `${SUPABASE_URL}/pg/query`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "apikey": SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(c.green(`  ✅ Management API success at ${endpoint}`));
        return { success: true, data };
      } else {
        const text = await res.text();
        console.log(c.dim(`  ⚠️  ${endpoint} → HTTP ${res.status}: ${text.slice(0, 100)}`));
      }
    } catch (err) {
      console.log(c.dim(`  ⚠️  ${endpoint} → ${err.message}`));
    }
  }
  return { success: false };
}

// ── Method 2: pg direct connection ───────────────────────────
async function tryPgConnection(sql) {
  const dbUrlIsPlaceholder =
    !DATABASE_URL ||
    DATABASE_URL.includes("REMPLACE") ||
    DATABASE_URL.includes("MOT_DE_PASSE");

  if (dbUrlIsPlaceholder) {
    console.log(c.yellow("  ⚠️  DATABASE_URL is a placeholder — skipping pg"));
    return { success: false, reason: "placeholder" };
  }

  console.log(c.cyan("  → Trying direct pg connection…"));

  let pg;
  try { pg = require("pg"); } catch { return { success: false }; }

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log(c.green("  ✅ pg connected"));
  } catch (err) {
    console.log(c.red(`  ❌ pg failed: ${err.message}`));
    return { success: false };
  }

  const statements = splitStatements(sql);
  let ok = 0; let err = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt    = statements[i];
    const preview = stmt.replace(/\s+/g, " ").slice(0, 70);
    try {
      await client.query(stmt);
      console.log(c.green(`  ✅ [${i + 1}/${statements.length}] ${preview}…`));
      ok++;
    } catch (e) {
      const msg = e.message.toLowerCase();
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log(c.dim(`  ⏭  [${i + 1}/${statements.length}] Already exists: ${preview}…`));
        ok++;
      } else {
        console.log(c.red(`  ❌ [${i + 1}/${statements.length}] ${e.message.split("\n")[0]}`));
        err++;
      }
    }
  }

  await client.end();
  return { success: err === 0, ok, err };
}

// ── Check tables via REST ─────────────────────────────────────
async function checkTables() {
  const tables = [
    "users","artworks","pass_core","pass_core_certifications","pass_core_messages",
    "ownership_history","transactions","royalties","subscriptions","bets","auctions",
    "listings","scouts","scouted_artists","rentals","affiliate_links","favorites",
    "notifications","anonymous_messages","settings","user_roles",
  ];
  const present = [];
  const missing = [];
  for (const t of tables) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=count&limit=0`, {
        headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, Prefer: "count=exact" },
      });
      (r.status < 300 ? present : missing).push(t);
    } catch { missing.push(t); }
  }
  return { present, missing };
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(c.bold(c.cyan("\n╔══════════════════════════════════════════╗")));
  console.log(c.bold(c.cyan("║   ART-CORE — Migration via API           ║")));
  console.log(c.bold(c.cyan("╚══════════════════════════════════════════╝")));

  console.log(c.cyan(`\n🆔 Project ref : ${PROJECT_REF}`));
  console.log(c.cyan(`📄 Migration   : ${path.basename(MIGRATION_FILE)}\n`));

  const sql = fs.readFileSync(MIGRATION_FILE, "utf8");
  console.log(c.dim(`   SQL size: ${(sql.length / 1024).toFixed(1)} KB\n`));

  // Try methods
  console.log(c.bold("📤 ÉTAPE 1 — Tentative d'exécution SQL"));
  const mgmtResult = await tryManagementAPI("SELECT 1 AS ping");
  let migrated = false;

  if (mgmtResult.success) {
    console.log(c.bold(c.green("\n  Management API fonctionne — envoi du schema complet…")));
    const fullResult = await tryManagementAPI(sql);
    migrated = fullResult.success;
  }

  if (!migrated) {
    const pgResult = await tryPgConnection(sql);
    migrated = pgResult.success;
  }

  // Check tables
  console.log(c.bold("\n📋 ÉTAPE 2 — Vérification des tables"));
  const { present, missing } = await checkTables();

  console.log(c.green(`  ✅ Present (${present.length}) : ${present.join(", ") || "none"}`));
  if (missing.length) {
    console.log(c.yellow(`  ⚠️  Missing (${missing.length}) : ${missing.join(", ")}`));
  }

  // Report
  console.log(c.bold(c.cyan("\n╔══════════════════════════════════════════╗")));
  console.log(c.bold(c.cyan("║                 RÉSULTAT                 ║")));
  console.log(c.bold(c.cyan("╚══════════════════════════════════════════╝")));
  console.log(c.green(`✅ Tables présentes  : ${present.length}/21`));
  console.log(present.length >= 21
    ? c.green("✅ Schéma            : COMPLET")
    : c.yellow(`⚠️  Schéma            : ${missing.length} tables manquantes`)
  );

  if (missing.length > 0) {
    console.log(c.bold(c.yellow("\n📋 MIGRATION MANUELLE (2 options) :")));
    console.log(c.bold("  Option A — URL directe (la plus rapide) :"));
    console.log(c.cyan(`  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`));
    console.log(c.dim(`  → Copier-coller le contenu de : supabase/migrations/001_initial_schema.sql\n`));

    console.log(c.bold("  Option B — DATABASE_URL dans .env.local :"));
    console.log(c.dim(`  DATABASE_URL=postgresql://postgres.${PROJECT_REF}:MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`));
    console.log(c.dim(`  (mot de passe dans : Supabase Dashboard → Settings → Database → Reset password)\n`));
  }

  return present.length;
}

main()
  .then((count) => {
    process.exitCode = count > 0 ? 0 : 1;
  })
  .catch((err) => {
    console.error(`\n💥 ${err.message}`);
    process.exit(1);
  });
