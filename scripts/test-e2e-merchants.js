#!/usr/bin/env node

/**
 * ART-CORE — Test E2E: merchants + cahier de police + badge
 *
 * 1. Create a test merchant "Galerie Test Normandie"
 * 2. Create a test artwork linked to this merchant via police_register_entries
 * 3. Generate CSV cahier de police
 * 4. Verify the badge "Certifié par Test Normandie" appears in the artwork data
 */

const fs = require("fs");
const path = require("path");

// Load env
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const pg = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not found"); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const TEST_MERCHANT_SIRET = "99999999900001";
const TEST_MERCHANT_EMAIL = "test-normandie@e2e-test.local";
const TEST_ARTWORK_ID = "00000000-e2e0-4000-a000-000000000001";

let results = { passed: 0, failed: 0, tests: [] };

function report(name, ok, detail) {
  results.tests.push({ name, ok, detail });
  if (ok) { results.passed++; console.log(`  ✓ ${name}`); }
  else { results.failed++; console.log(`  ✗ ${name}: ${detail}`); }
}

(async () => {
  console.log("\n" + "=".repeat(60));
  console.log("ART-CORE — Test E2E: Merchants + Cahier de Police");
  console.log("=".repeat(60) + "\n");

  try {
    // ── STEP 1: Create test merchant ────────────────────────
    console.log("Step 1: Create test merchant...");

    // Clean up any previous test data
    await pool.query("DELETE FROM police_register_entries WHERE artwork_id = $1", [TEST_ARTWORK_ID]);
    await pool.query("DELETE FROM artworks WHERE id = $1", [TEST_ARTWORK_ID]);
    await pool.query("DELETE FROM merchants WHERE siret = $1", [TEST_MERCHANT_SIRET]);

    // Get a test user_id from auth.users (use the first one available, or create via profiles)
    const { rows: existingUsers } = await pool.query(
      "SELECT id FROM auth.users LIMIT 1"
    );

    let testUserId;
    if (existingUsers.length > 0) {
      testUserId = existingUsers[0].id;
    } else {
      // Fallback: check public users table
      const { rows: publicUsers } = await pool.query("SELECT id FROM users LIMIT 1");
      testUserId = publicUsers.length > 0 ? publicUsers[0].id : null;
    }

    // Insert merchant (user_id can be null for test if no auth.users exist)
    const merchantInsert = await pool.query(`
      INSERT INTO merchants (raison_sociale, siret, activite, nom_gerant, email, telephone, adresse, code_postal, ville, numero_rom_prefix, abonnement, actif${testUserId ? ', user_id' : ''})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12${testUserId ? ', $13' : ''})
      RETURNING id, raison_sociale
    `, [
      "Galerie Test Normandie",
      TEST_MERCHANT_SIRET,
      "Galerie d'art contemporain",
      "Jean Testeur",
      TEST_MERCHANT_EMAIL,
      "+33612345678",
      "12 rue du Test",
      "76000",
      "Rouen",
      "ROM-TEST",
      "standard",
      true,
      ...(testUserId ? [testUserId] : []),
    ]);

    const merchant = merchantInsert.rows[0];
    report("Merchant created", !!merchant, merchant ? `id=${merchant.id}, name=${merchant.raison_sociale}` : "INSERT failed");

    // Verify merchant in DB
    const { rows: merchantCheck } = await pool.query(
      "SELECT * FROM merchants WHERE siret = $1", [TEST_MERCHANT_SIRET]
    );
    report("Merchant in DB", merchantCheck.length === 1 && merchantCheck[0].raison_sociale === "Galerie Test Normandie",
      merchantCheck.length === 1 ? `Found: ${merchantCheck[0].raison_sociale}` : "Not found");

    // ── STEP 2: Create test artwork + police register entry ──
    console.log("\nStep 2: Create test artwork + certification...");

    // Get an artist_id
    const { rows: artists } = await pool.query(
      "SELECT id FROM users WHERE role = 'artist' LIMIT 1"
    );
    const artistId = artists.length > 0 ? artists[0].id : (testUserId || "usr_artist_1");

    // Insert artwork
    await pool.query(`
      INSERT INTO artworks (id, title, artist_id, owner_id, description, category, status, price,
        blockchain_hash, blockchain_tx_id, certification_date, certification_status, gauge_points, listed_at)
      VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (id) DO UPDATE SET blockchain_hash = EXCLUDED.blockchain_hash
    `, [
      TEST_ARTWORK_ID,
      "Falaises d'Etretat — Test E2E",
      artistId,
      "Peinture de test pour validation cahier de police marchand.",
      "painting",
      "for_sale",
      3500,
      "0xE2ETEST" + "A".repeat(56),
      "tx_e2e_test_001",
      new Date().toISOString(),
      "approved",
      42,
    ]);

    const { rows: artCheck } = await pool.query("SELECT id, title, blockchain_hash FROM artworks WHERE id = $1", [TEST_ARTWORK_ID]);
    report("Artwork created", artCheck.length === 1 && !!artCheck[0].blockchain_hash,
      artCheck.length > 0 ? `"${artCheck[0].title}" — hash: ${artCheck[0].blockchain_hash.substring(0, 20)}...` : "Not found");

    // Link artwork to merchant via police_register_entries
    // Get next entry_number
    const { rows: maxEntry } = await pool.query("SELECT COALESCE(MAX(entry_number), 0) + 1 as next_num FROM police_register_entries");
    const nextNum = maxEntry[0].next_num;

    await pool.query(`
      INSERT INTO police_register_entries (entry_number, user_id, artwork_id, merchant_id, designation, description, category, transaction_type, price, seller_name, seller_address, seller_last_name, seller_first_name, acquisition_date, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    `, [
      nextNum,
      artistId,
      TEST_ARTWORK_ID,
      merchant.id,
      "Falaises d'Etretat — Test E2E",
      "Peinture huile sur toile, paysage normand",
      "painting",
      "acquisition",
      3500,
      "Jean Vendeur Test",
      "15 avenue du Test, 76000 Rouen",
      "Vendeur",
      "Jean",
    ]);

    const { rows: regCheck } = await pool.query(
      "SELECT * FROM police_register_entries WHERE artwork_id = $1 AND merchant_id = $2",
      [TEST_ARTWORK_ID, merchant.id]
    );
    report("Police register entry created", regCheck.length === 1,
      regCheck.length > 0 ? `merchant_id=${regCheck[0].merchant_id}` : "Not found");

    // ── STEP 3: Generate cahier de police CSV ───────────────
    console.log("\nStep 3: Generate cahier de police CSV...");

    const { rows: cahierEntries } = await pool.query(`
      SELECT
        pre.created_at, pre.designation, pre.category, pre.transaction_type, pre.price,
        pre.seller_name, pre.seller_address,
        m.raison_sociale, m.siret, m.numero_rom_prefix
      FROM police_register_entries pre
      JOIN merchants m ON m.id = pre.merchant_id
      WHERE m.siret = $1
      ORDER BY pre.created_at DESC
    `, [TEST_MERCHANT_SIRET]);

    report("Cahier de police entries found", cahierEntries.length >= 1,
      `${cahierEntries.length} entree(s) pour Galerie Test Normandie`);

    // Generate CSV
    const csvHeaders = "N°;Date;Designation;Categorie;Transaction;Prix;Vendeur;Adresse Vendeur;N° ROM;SIRET;Raison Sociale";
    const csvRows = cahierEntries.map((e, i) => {
      const rom = e.numero_rom_prefix ? `${e.numero_rom_prefix}-${String(i + 1).padStart(4, "0")}` : "";
      return [
        i + 1,
        new Date(e.created_at).toLocaleDateString("fr-FR"),
        `"${e.designation}"`,
        e.category,
        e.transaction_type,
        e.price,
        `"${e.seller_name}"`,
        `"${e.seller_address}"`,
        rom,
        e.siret,
        `"${e.raison_sociale}"`,
      ].join(";");
    });

    const csv = [csvHeaders, ...csvRows].join("\n");
    const csvPath = path.join(__dirname, "../cahier-de-police-test.csv");
    fs.writeFileSync(csvPath, "\uFEFF" + csv, "utf-8");

    const csvExists = fs.existsSync(csvPath);
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    report("CSV generated", csvExists && csvContent.includes("Galerie Test Normandie"),
      csvExists ? `${csvPath} (${csvContent.split("\n").length} lines)` : "File not created");

    console.log("\n  --- CSV Preview ---");
    console.log("  " + csv.split("\n").join("\n  "));
    console.log("  --- End CSV ---\n");

    // ── STEP 4: Verify badge data ───────────────────────────
    console.log("Step 4: Verify badge 'Certifié par Test Normandie'...");

    // Simulate what the artwork detail page does (same query as oeuvre/[id]/page.tsx lines 52-73)
    const { rows: badgeCheck } = await pool.query(`
      SELECT m.raison_sociale, m.numero_rom_prefix
      FROM police_register_entries pre
      JOIN merchants m ON m.id = pre.merchant_id
      WHERE pre.artwork_id = $1
      AND pre.merchant_id IS NOT NULL
      LIMIT 1
    `, [TEST_ARTWORK_ID]);

    const hasBadge = badgeCheck.length > 0 && badgeCheck[0].raison_sociale === "Galerie Test Normandie";
    report("Badge 'Certifié par Galerie Test Normandie'", hasBadge,
      hasBadge ? `raison_sociale="${badgeCheck[0].raison_sociale}", ROM="${badgeCheck[0].numero_rom_prefix}"` : "Badge not found");

    // Simulate what the artworks list API does (enrichment query)
    const { rows: listCheck } = await pool.query(`
      SELECT a.id, a.title, m.raison_sociale as merchant_name
      FROM artworks a
      LEFT JOIN police_register_entries pre ON pre.artwork_id = a.id AND pre.merchant_id IS NOT NULL
      LEFT JOIN merchants m ON m.id = pre.merchant_id
      WHERE a.id = $1
    `, [TEST_ARTWORK_ID]);

    report("ArtworkCard merchant_name enrichment",
      listCheck.length > 0 && listCheck[0].merchant_name === "Galerie Test Normandie",
      listCheck.length > 0 ? `merchant_name="${listCheck[0].merchant_name}"` : "Not found");

    // ── CLEANUP ──────────────────────────────────────────────
    console.log("\nCleaning up test data...");
    await pool.query("DELETE FROM police_register_entries WHERE artwork_id = $1", [TEST_ARTWORK_ID]);
    await pool.query("DELETE FROM artworks WHERE id = $1", [TEST_ARTWORK_ID]);
    await pool.query("DELETE FROM merchants WHERE siret = $1", [TEST_MERCHANT_SIRET]);
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
    console.log("  Cleanup done.");

  } catch (err) {
    console.error("\nFATAL ERROR:", err.message);
    report("Unexpected error", false, err.message);
  } finally {
    await pool.end();
  }

  // ── FINAL REPORT ────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`RESULTS: ${results.passed} passed, ${results.failed} failed, ${results.passed + results.failed} total`);
  console.log("=".repeat(60) + "\n");

  process.exit(results.failed > 0 ? 1 : 0);
})();
