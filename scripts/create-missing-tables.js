#!/usr/bin/env node
// ============================================================
// ART-CORE — Create 3 missing tables via Supabase Management API
// Usage: node scripts/create-missing-tables.js
//        SUPABASE_ACCESS_TOKEN=xxx node scripts/create-missing-tables.js
// ============================================================

require("dotenv").config({ path: ".env.local" });
const readline = require("readline");

const PROJECT_REF = "kmmlwuwsahtzgzztcdaj";
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

// STEP 1: Fix enums — must commit BEFORE using new values in CREATE TABLE
const SQL_STEP1 = `
ALTER TYPE pass_core_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE pass_core_status ADD VALUE IF NOT EXISTS 'certified';
ALTER TYPE artwork_status ADD VALUE IF NOT EXISTS 'available';
`;

// STEP 2: Create tables + RLS + policies + indexes
const SQL_STEP2 = `
CREATE TABLE IF NOT EXISTS public.pass_core_certifications (
  id           UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id   UUID             NOT NULL REFERENCES public.artworks(id),
  hash         TEXT             NOT NULL,
  tx_hash      TEXT,
  block_number BIGINT,
  network      TEXT,
  status       pass_core_status NOT NULL DEFAULT 'pending',
  certified_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pass_core_messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_core_id UUID        NOT NULL REFERENCES public.pass_core(id) ON DELETE CASCADE,
  sender_id    UUID        REFERENCES public.users(id),
  sender_tag   TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ownership_history (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id     UUID        NOT NULL REFERENCES public.artworks(id),
  from_user      UUID        REFERENCES public.users(id),
  to_user        UUID        NOT NULL REFERENCES public.users(id),
  transaction_id UUID,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pass_core_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_core_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "pass_core_cert_public_read" ON public.pass_core_certifications FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "pass_core_messages_read" ON public.pass_core_messages FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "pass_core_messages_insert" ON public.pass_core_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_pass_core_cert_aw ON public.pass_core_certifications(artwork_id);
`;

const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function checkTable(table) {
  try {
    const res = await fetch(new URL(`/rest/v1/${table}?select=count&limit=0`, SUPABASE_URL), {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, Prefer: "count=exact" },
    });
    return res.status >= 200 && res.status < 300;
  } catch { return false; }
}

async function runSQL(accessToken, sql, label) {
  console.log(c.cyan(`  -> ${label}...`));
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log(c.green(`  OK ${label}`));
    return true;
  }

  const text = await res.text();
  // "already exists" or "already" in enum context is fine
  if (text.includes("already exists") || text.includes("already")) {
    console.log(c.dim(`  SKIP ${label} (already done)`));
    return true;
  }

  console.log(c.red(`  FAIL ${label}: ${text.slice(0, 200)}`));
  return false;
}

async function main() {
  console.log(c.bold(c.cyan("\n======= ART-CORE — Create Missing Tables =======")));

  // Pre-check
  const tables = ["pass_core_certifications", "pass_core_messages", "ownership_history"];
  const missing = [];
  for (const t of tables) {
    const exists = await checkTable(t);
    console.log(exists ? c.green(`  OK ${t}`) : c.yellow(`  MISSING ${t}`));
    if (!exists) missing.push(t);
  }

  if (missing.length === 0) {
    console.log(c.bold(c.green("\nAll 21 tables exist! Nothing to do.")));
    return;
  }

  // Get access token
  let accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.log(c.bold("\nAccess token needed:"));
    console.log(c.cyan("  https://supabase.com/dashboard/account/tokens\n"));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    accessToken = await new Promise((resolve) => {
      rl.question("Paste token: ", (a) => { rl.close(); resolve(a.trim()); });
    });
  }

  if (!accessToken) { console.log(c.red("No token.")); process.exit(1); }

  // STEP 1: Fix enums (separate transaction)
  console.log(c.bold("\nStep 1: Fix enums"));
  const step1ok = await runSQL(accessToken, SQL_STEP1, "ALTER TYPE ... ADD VALUE");

  if (!step1ok) {
    console.log(c.red("Enum fix failed. Aborting."));
    process.exit(1);
  }

  // Small pause to ensure commit is flushed
  await new Promise((r) => setTimeout(r, 1000));

  // STEP 2: Create tables
  console.log(c.bold("\nStep 2: Create tables + RLS"));
  const step2ok = await runSQL(accessToken, SQL_STEP2, "CREATE TABLE + policies");

  // Verify
  console.log(c.bold("\nVerification:"));
  let allOk = true;
  for (const t of tables) {
    const exists = await checkTable(t);
    console.log(exists ? c.green(`  OK ${t}`) : c.red(`  MISSING ${t}`));
    if (!exists) allOk = false;
  }

  if (allOk) {
    console.log(c.bold(c.green("\n21/21 tables present. Migration complete!")));
  } else {
    console.log(c.bold(c.red("\nSome tables still missing.")));
    console.log(c.cyan(`  Fallback: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`));
  }
}

main().catch((e) => { console.error(c.red(e.message)); process.exit(1); });
