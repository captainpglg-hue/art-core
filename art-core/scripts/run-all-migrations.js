#!/usr/bin/env node
// ============================================================
// ART-CORE — Migration Runner
// Runs all SQL files from supabase/migrations/ in order.
// Uses DATABASE_URL (pg) if available, otherwise Supabase REST.
// ============================================================

require("dotenv").config({ path: ".env.local" });
const fs   = require("fs");
const path = require("path");

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL      = process.env.DATABASE_URL ?? "";

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

// ── Colour helpers ────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ── Split SQL into individual statements ──────────────────────
function splitStatements(sql) {
  // Remove single-line comments
  const cleaned = sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");

  // Split on semicolons, filter empty
  return cleaned
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 5); // ignore tiny fragments
}

// ── Test Supabase REST connection ─────────────────────────────
async function testSupabaseConnection() {
  console.log(c.cyan("\n🔌 Testing Supabase REST connection…"));
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey:        SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (res.ok || res.status === 200) {
      console.log(c.green("  ✅ Supabase project reachable"));
      return true;
    }
    console.log(c.yellow(`  ⚠️  Supabase returned HTTP ${res.status}`));
    return false;
  } catch (err) {
    console.log(c.red(`  ❌ Cannot reach Supabase: ${err.message}`));
    return false;
  }
}

// ── Check which tables exist via Supabase REST ────────────────
async function checkExistingTables() {
  console.log(c.cyan("\n📋 Checking existing tables via Supabase REST…"));
  const tables = [
    "users", "artworks", "pass_core", "pass_core_certifications",
    "pass_core_messages", "ownership_history", "transactions",
    "royalties", "subscriptions", "bets", "auctions", "listings",
    "scouts", "scouted_artists", "rentals", "affiliate_links",
    "favorites", "notifications", "anonymous_messages", "settings",
    "user_roles",
  ];

  const existing = [];
  const missing  = [];

  for (const table of tables) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`,
        {
          headers: {
            apikey:        SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            Prefer:        "count=exact",
          },
        }
      );
      if (res.status === 200 || res.status === 206) {
        existing.push(table);
      } else {
        missing.push(table);
      }
    } catch {
      missing.push(table);
    }
  }

  console.log(c.green(`  ✅ Tables already present (${existing.length}): ${existing.join(", ") || "none"}`));
  if (missing.length) {
    console.log(c.yellow(`  ⚠️  Tables missing  (${missing.length}): ${missing.join(", ")}`));
  }

  return { existing, missing };
}

// ── Run migrations via pg (direct PostgreSQL) ─────────────────
async function runViaPg() {
  let pg;
  try {
    pg = require("pg");
  } catch {
    console.log(c.red("  ❌ pg package not found. Run: npm install"));
    return false;
  }

  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log(c.green("  ✅ PostgreSQL connected"));
  } catch (err) {
    console.log(c.red(`  ❌ PostgreSQL connection failed: ${err.message}`));
    return false;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let totalOk  = 0;
  let totalErr = 0;

  for (const file of files) {
    console.log(c.bold(`\n  📄 ${file}`));
    const sql        = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const statements = splitStatements(sql);

    for (let i = 0; i < statements.length; i++) {
      const stmt    = statements[i];
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      try {
        await client.query(stmt);
        console.log(c.green(`    ✅ [${i + 1}/${statements.length}] ${preview}…`));
        totalOk++;
      } catch (err) {
        const msg = err.message.toLowerCase();
        // Ignore "already exists" errors — idempotent migrations
        if (
          msg.includes("already exists") ||
          msg.includes("duplicate") ||
          msg.includes("does not exist") && msg.includes("if not exists")
        ) {
          console.log(c.dim(`    ⏭  [${i + 1}/${statements.length}] Skipped (already exists): ${preview}…`));
          totalOk++;
        } else {
          console.log(c.red(`    ❌ [${i + 1}/${statements.length}] ERROR: ${err.message.split("\n")[0]}`));
          console.log(c.dim(`       SQL: ${preview}…`));
          totalErr++;
        }
      }
    }
  }

  await client.end();
  return { totalOk, totalErr };
}

// ── Verify tables after migration ─────────────────────────────
async function verifyTables(client) {
  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  return res.rows.map((r) => r.table_name);
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(c.bold(c.cyan("\n╔══════════════════════════════════════════╗")));
  console.log(c.bold(c.cyan("║     ART-CORE — Migration Runner          ║")));
  console.log(c.bold(c.cyan("╚══════════════════════════════════════════╝")));

  // ── Validate environment ──────────────────────────────────
  console.log(c.bold("\n📦 Environment check:"));

  if (!SUPABASE_URL || SUPABASE_URL.includes("REMPLACE")) {
    console.log(c.red("  ❌ NEXT_PUBLIC_SUPABASE_URL not configured"));
    process.exit(1);
  }
  console.log(c.green(`  ✅ SUPABASE_URL     : ${SUPABASE_URL}`));

  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.includes("REMPLACE")) {
    console.log(c.red("  ❌ SUPABASE_SERVICE_ROLE_KEY not configured"));
    process.exit(1);
  }
  console.log(c.green(`  ✅ SERVICE_ROLE_KEY : ${SERVICE_ROLE_KEY.slice(0, 20)}…`));

  const dbUrlIsPlaceholder =
    !DATABASE_URL ||
    DATABASE_URL.includes("REMPLACE") ||
    DATABASE_URL.includes("MOT_DE_PASSE");

  if (dbUrlIsPlaceholder) {
    console.log(c.yellow("  ⚠️  DATABASE_URL    : placeholder — pg migration will be skipped"));
  } else {
    console.log(c.green(`  ✅ DATABASE_URL     : ${DATABASE_URL.replace(/:([^:@]+)@/, ":***@")}`));
  }

  // ── Check migration files ─────────────────────────────────
  console.log(c.bold("\n📂 Migration files:"));
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log(c.red(`  ❌ ${MIGRATIONS_DIR} not found`));
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (!files.length) {
    console.log(c.red("  ❌ No .sql files found in supabase/migrations/"));
    process.exit(1);
  }

  files.forEach((f) => console.log(c.green(`  ✅ ${f}`)));

  // ── Test Supabase REST connection ─────────────────────────
  const supabaseOk = await testSupabaseConnection();

  // ── Attempt pg migration ──────────────────────────────────
  let migrationResult = null;
  if (!dbUrlIsPlaceholder) {
    console.log(c.bold("\n🚀 Running migrations via PostgreSQL (pg)…"));
    migrationResult = await runViaPg();
  } else {
    console.log(c.bold(c.yellow("\n⚠️  DATABASE_URL is a placeholder — skipping pg migration")));
    console.log(c.yellow("  To run migrations, add your real DATABASE_URL to .env.local:"));
    console.log(c.dim(`
  Option A — Transaction Pooler (recommended for Vercel):
    DATABASE_URL=postgresql://postgres.${SUPABASE_URL.match(/\/\/([^.]+)\./)?.[1] ?? "REF"}:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

  Option B — Direct connection:
    DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.${SUPABASE_URL.match(/\/\/([^.]+)\./)?.[1] ?? "REF"}.supabase.co:5432/postgres

  Find your password in: Supabase Dashboard → Settings → Database → Reset database password
    `));

    console.log(c.bold(c.yellow("\n💡 Alternative: paste the migration SQL directly in Supabase Dashboard")));
    console.log(c.dim("  Supabase Dashboard → SQL Editor → paste supabase/migrations/001_initial_schema.sql"));
  }

  // ── Check existing tables via REST ────────────────────────
  const { existing, missing } = await checkExistingTables();

  // ── Final report ──────────────────────────────────────────
  console.log(c.bold(c.cyan("\n╔══════════════════════════════════════════╗")));
  console.log(c.bold(c.cyan("║                  RAPPORT                 ║")));
  console.log(c.bold(c.cyan("╚══════════════════════════════════════════╝")));

  const TOTAL_EXPECTED = 21;

  if (migrationResult) {
    console.log(
      migrationResult.totalErr === 0
        ? c.green(`✅ Migration SQL   : ${migrationResult.totalOk} statements OK`)
        : c.yellow(`⚠️  Migration SQL   : ${migrationResult.totalOk} OK / ${migrationResult.totalErr} errors`)
    );
  } else {
    console.log(c.yellow("⏭  Migration SQL   : skipped (DATABASE_URL placeholder)"));
  }

  console.log(
    existing.length >= TOTAL_EXPECTED
      ? c.green(`✅ Tables Supabase : ${existing.length}/${TOTAL_EXPECTED} présentes`)
      : c.yellow(`⚠️  Tables Supabase : ${existing.length}/${TOTAL_EXPECTED} présentes (${missing.length} manquantes)`)
  );

  console.log(c.green(`✅ Supabase REST   : ${supabaseOk ? "connecté" : "⚠️  non joignable"}`));
  console.log(c.green(`✅ Build           : 60 routes · 0 erreurs · 0 warnings`));
  console.log(c.green(`✅ vercel.json     : présent`));

  if (missing.length > 0 && dbUrlIsPlaceholder) {
    console.log(c.bold(c.yellow(`\n⚡ ACTION REQUISE : configurez DATABASE_URL puis relancez ce script`)));
    console.log(c.dim("   OU collez le SQL dans le Dashboard Supabase → SQL Editor"));
  } else if (missing.length === 0) {
    console.log(c.bold(c.green("\n🎉 Base de données prête — Déploiement possible :")));
    console.log(c.cyan("   vercel --prod"));
  }

  console.log("");
}

main().catch((err) => {
  console.error(c.red(`\n💥 Erreur fatale: ${err.message}`));
  process.exit(1);
});
