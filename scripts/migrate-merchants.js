#!/usr/bin/env node

/**
 * ART-CORE — Migration: table merchants
 * Uses direct PostgreSQL connection via DATABASE_URL
 */

const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SERVICE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY not found");
  process.exit(1);
}

const SQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    raison_sociale TEXT NOT NULL,
    siret TEXT NOT NULL UNIQUE,
    activite TEXT NOT NULL,
    nom_gerant TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telephone TEXT,
    adresse TEXT,
    code_postal TEXT,
    ville TEXT,
    numero_rom_prefix TEXT,
    abonnement TEXT DEFAULT 'gratuit',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    actif BOOLEAN DEFAULT true
  )`,
  `ALTER TABLE merchants ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'merchants_own' AND tablename = 'merchants') THEN
      CREATE POLICY "merchants_own" ON merchants USING (user_id = auth.uid());
    END IF;
  END $$`,
  `CREATE INDEX IF NOT EXISTS idx_merchants_siret ON merchants(siret)`,
  `CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email)`,
  // Link police_register_entries → merchants
  `ALTER TABLE police_register_entries ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id)`,
  `CREATE INDEX IF NOT EXISTS idx_register_merchant ON police_register_entries(merchant_id)`,
  // Convenience columns for cahier de police API
  `ALTER TABLE police_register_entries ADD COLUMN IF NOT EXISTS designation TEXT`,
  `ALTER TABLE police_register_entries ADD COLUMN IF NOT EXISTS transaction_type TEXT`,
  `ALTER TABLE police_register_entries ADD COLUMN IF NOT EXISTS price NUMERIC`,
  `ALTER TABLE police_register_entries ADD COLUMN IF NOT EXISTS seller_name TEXT`,
  `ALTER TABLE police_register_entries ADD COLUMN IF NOT EXISTS seller_address TEXT`,
  `ALTER TABLE police_register_entries ADD COLUMN IF NOT EXISTS buyer_name TEXT`,
  `ALTER TABLE police_register_entries ADD COLUMN IF NOT EXISTS buyer_address TEXT`,
];

console.log("=".repeat(60));
console.log("ART-CORE — Migration: merchants table");
console.log("=".repeat(60));
console.log("URL:", SUPABASE_URL);

(async () => {
  try {
    const pg = require("pg");
    const pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const test = await pool.query("SELECT version()");
    console.log("Connected:", test.rows[0].version.substring(0, 50) + "...\n");

    let success = 0;
    let errors = [];

    for (let i = 0; i < SQL_STATEMENTS.length; i++) {
      const stmt = SQL_STATEMENTS[i];
      const preview = stmt.replace(/\s+/g, " ").substring(0, 70);
      process.stdout.write(`[${i + 1}/${SQL_STATEMENTS.length}] ${preview}...`);

      try {
        await pool.query(stmt);
        console.log(" OK");
        success++;
      } catch (err) {
        if (err.message.includes("already exists")) {
          console.log(" OK (already exists)");
          success++;
        } else {
          console.log(` FAIL: ${err.message}`);
          errors.push(err.message);
        }
      }
    }

    await pool.end();
    console.log("\n" + "=".repeat(60));
    console.log(`Results: ${success}/${SQL_STATEMENTS.length} OK, ${errors.length} errors`);
    if (errors.length > 0) errors.forEach((e) => console.log("  - " + e));
    console.log("=".repeat(60));
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
})();
