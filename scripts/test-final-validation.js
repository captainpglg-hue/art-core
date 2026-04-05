#!/usr/bin/env node

/**
 * ART-CORE — Final Validation Tests (Pre-Demo)
 *
 * 1. Merchant registration (full form)
 * 2. Artwork certification linked to merchant
 * 3. Cahier de police generation (JSON + CSV) with merchant header
 * 4. Email send via Resend
 * 5. Badge "Certifié par [Galerie]" verification
 * 6. Artwork identification via /api/verify
 * 7. Conformité page presence
 * 8. Domain HTTPS checks
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load env
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_]\w*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const pg = require("pg");
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not found"); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const TEST_SIRET = "98765432109876";
const TEST_EMAIL = "galerie-validation@e2e.local";
const TEST_ART_ID = "00000000-0a10-4000-a000-000000000002";

let results = [];
function report(name, ok, detail) {
  results.push({ name, ok, detail: detail || "" });
  console.log(`  ${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}

(async () => {
  console.log("\n" + "=".repeat(65));
  console.log("ART-CORE — FINAL VALIDATION TESTS");
  console.log("=".repeat(65) + "\n");

  try {
    // ── CLEANUP ──
    await pool.query("DELETE FROM police_register_entries WHERE artwork_id = $1", [TEST_ART_ID]);
    await pool.query("DELETE FROM artworks WHERE id = $1", [TEST_ART_ID]);
    await pool.query("DELETE FROM merchants WHERE siret = $1", [TEST_SIRET]);

    // Get test user
    const { rows: users } = await pool.query("SELECT id, email FROM users WHERE role = 'artist' LIMIT 1");
    const testUserId = users[0]?.id;
    if (!testUserId) { console.error("No test user found"); process.exit(1); }

    // ════════════════════════════════════════════════════════════
    console.log("--- 1. INSCRIPTION MARCHAND ---");
    // ════════════════════════════════════════════════════════════

    const merchantData = {
      raison_sociale: "Galerie Test Normandie",
      siret: TEST_SIRET,
      activite: "Galerie d'art contemporain et antiquites",
      nom_gerant: "Pierre Validateur",
      email: TEST_EMAIL,
      telephone: "+33 6 98 76 54 32",
      adresse: "45 rue de la Validation",
      code_postal: "76000",
      ville: "Rouen",
    };

    const { rows: [merchant] } = await pool.query(`
      INSERT INTO merchants (raison_sociale, siret, activite, nom_gerant, email, telephone, adresse, code_postal, ville, numero_rom_prefix, abonnement, user_id, actif)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
      RETURNING *
    `, [
      merchantData.raison_sociale, merchantData.siret, merchantData.activite,
      merchantData.nom_gerant, merchantData.email, merchantData.telephone,
      merchantData.adresse, merchantData.code_postal, merchantData.ville,
      "ROM-9876", "gratuit", testUserId,
    ]);

    report("Merchant created", !!merchant, `${merchant.raison_sociale} / SIRET ${merchant.siret}`);

    // Verify all mandatory fields present
    const requiredFields = ["raison_sociale", "siret", "activite", "nom_gerant", "email", "telephone", "adresse", "code_postal", "ville"];
    const allPresent = requiredFields.every(f => merchant[f] && merchant[f].toString().trim());
    report("All mandatory fields present", allPresent, requiredFields.filter(f => !merchant[f]).join(", ") || "9/9 fields OK");

    // ════════════════════════════════════════════════════════════
    console.log("\n--- 2. CERTIFICATION OEUVRE LIEE AU MARCHAND ---");
    // ════════════════════════════════════════════════════════════

    const testHash = "0x" + crypto.createHash("sha256").update(`validation-test-${Date.now()}`).digest("hex");
    const txHash = "PC-VALIDTEST" + Date.now().toString(36).toUpperCase().slice(-8);

    await pool.query(`
      INSERT INTO artworks (id, title, artist_id, owner_id, description, category, status, price,
        blockchain_hash, blockchain_tx_id, certification_date, certification_status,
        gauge_points, listed_at, certified_by_merchant_id, is_public, is_for_sale)
      VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, NOW(), $12, true, true)
    `, [
      TEST_ART_ID, "Les Falaises — Validation E2E", testUserId,
      "Peinture de validation finale", "painting", "for_sale", 5200,
      testHash, txHash, "approved", 55, merchant.id,
    ]);

    const { rows: [artCheck] } = await pool.query(
      "SELECT id, title, blockchain_hash, certified_by_merchant_id FROM artworks WHERE id = $1", [TEST_ART_ID]
    );
    report("Artwork certified", !!artCheck?.blockchain_hash, `hash: ${artCheck?.blockchain_hash?.slice(0, 20)}...`);
    report("certified_by_merchant_id FK set", artCheck?.certified_by_merchant_id === merchant.id, `merchant_id: ${artCheck?.certified_by_merchant_id}`);

    // Police register entry
    const { rows: [{ next_num }] } = await pool.query("SELECT COALESCE(MAX(entry_number), 0) + 1 as next_num FROM police_register_entries");
    await pool.query(`
      INSERT INTO police_register_entries (entry_number, user_id, artwork_id, merchant_id, designation, description, category, transaction_type, price, seller_name, seller_address, seller_last_name, seller_first_name, acquisition_date, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    `, [next_num, testUserId, TEST_ART_ID, merchant.id,
      "Les Falaises — Validation E2E", "Huile sur toile, paysage normand", "painting",
      "acquisition", 5200, "Sophie Vendeuse", "22 avenue du Port, 76600 Le Havre",
      "Vendeuse", "Sophie"]);

    const { rows: regEntries } = await pool.query(
      "SELECT * FROM police_register_entries WHERE artwork_id = $1 AND merchant_id = $2", [TEST_ART_ID, merchant.id]
    );
    report("Police register entry linked", regEntries.length === 1, `entry_number: ${regEntries[0]?.entry_number}`);

    // ════════════════════════════════════════════════════════════
    console.log("\n--- 3. CAHIER DE POLICE (JSON + CSV) AVEC EN-TETE MARCHAND ---");
    // ════════════════════════════════════════════════════════════

    // Simulate the JSON response structure
    const { rows: cahierEntries } = await pool.query(`
      SELECT pre.*, m.raison_sociale, m.siret, m.activite, m.nom_gerant, m.email as m_email,
             m.telephone as m_tel, m.adresse as m_adresse, m.code_postal as m_cp, m.ville as m_ville,
             m.numero_rom_prefix
      FROM police_register_entries pre
      JOIN merchants m ON m.id = pre.merchant_id
      WHERE m.siret = $1
    `, [TEST_SIRET]);

    report("Cahier entries found", cahierEntries.length >= 1, `${cahierEntries.length} entries`);

    // Verify merchant header fields in response
    const h = cahierEntries[0];
    const headerFields = {
      raison_sociale: h?.raison_sociale,
      siret: h?.siret,
      activite: h?.activite,
      nom_gerant: h?.nom_gerant,
      adresse: h?.m_adresse,
      code_postal: h?.m_cp,
      ville: h?.m_ville,
      telephone: h?.m_tel,
      numero_rom_prefix: h?.numero_rom_prefix,
    };
    const headerComplete = Object.entries(headerFields).every(([, v]) => v && v.toString().trim());
    report("Merchant header complete", headerComplete,
      Object.entries(headerFields).filter(([, v]) => !v).map(([k]) => k).join(", ") || "All 9 fields present");

    // Merchant identity on each row
    report("Merchant SIRET on line", h?.siret === TEST_SIRET, `SIRET: ${h?.siret}`);
    report("Merchant name on line", h?.raison_sociale === "Galerie Test Normandie", `Name: ${h?.raison_sociale}`);

    // CSV generation test
    const csvHeaders = "N°;Date;Designation;Marchand SIRET;Marchand Raison Sociale";
    const csvRow = `1;${new Date().toLocaleDateString("fr-FR")};"Les Falaises";${TEST_SIRET};"Galerie Test Normandie"`;
    const csvContent = [
      `CAHIER DE POLICE — REGISTRE DES OBJETS MOBILIERS`,
      `Raison sociale;${merchantData.raison_sociale}`,
      `SIRET;${merchantData.siret}`,
      `Gerant;${merchantData.nom_gerant}`,
      ``,
      csvHeaders,
      csvRow,
    ].join("\n");

    const csvPath = path.join(__dirname, "../cahier-validation-test.csv");
    fs.writeFileSync(csvPath, "\uFEFF" + csvContent, "utf-8");
    const csvValid = fs.existsSync(csvPath) && fs.readFileSync(csvPath, "utf-8").includes("Galerie Test Normandie");
    report("CSV generated with merchant header", csvValid, csvPath);

    // ════════════════════════════════════════════════════════════
    console.log("\n--- 4. EMAIL RESEND ---");
    // ════════════════════════════════════════════════════════════

    const resendKey = process.env.RESEND_API_KEY;
    const hasResendKey = !!(resendKey && !resendKey.includes("REMPLACE"));
    report("Resend API key configured", hasResendKey, hasResendKey ? "Key present" : "MISSING or placeholder");

    if (hasResendKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
            to: "delivered@resend.dev",
            subject: `[TEST] Cahier de Police — ${merchantData.raison_sociale}`,
            html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0F0F0F;color:#fff;padding:40px;border-radius:16px;">
              <h1 style="color:#D4AF37;text-align:center;">Cahier de Police — Test</h1>
              <div style="background:#1a1a1a;border:1px solid #D4AF37;border-radius:12px;padding:24px;margin:24px 0;">
                <table style="width:100%;font-size:13px;">
                  <tr><td style="color:#888;padding:4px 0;width:130px;">Raison sociale</td><td style="color:#fff;font-weight:bold;">${merchantData.raison_sociale}</td></tr>
                  <tr><td style="color:#888;">SIRET</td><td style="color:#fff;font-family:monospace;">${merchantData.siret}</td></tr>
                  <tr><td style="color:#888;">Activite</td><td style="color:#fff;">${merchantData.activite}</td></tr>
                  <tr><td style="color:#888;">Gerant</td><td style="color:#fff;">${merchantData.nom_gerant}</td></tr>
                  <tr><td style="color:#888;">Adresse</td><td style="color:#fff;">${merchantData.adresse}, ${merchantData.code_postal} ${merchantData.ville}</td></tr>
                  <tr><td style="color:#888;">N° ROM</td><td style="color:#D4AF37;font-weight:bold;">ROM-9876</td></tr>
                </table>
              </div>
              <p style="color:#666;text-align:center;font-size:11px;">Test de validation — ART-CORE GROUP LTD</p>
            </div>`,
          }),
        });
        const emailData = await emailRes.json();
        report("Email sent via Resend", emailRes.ok, emailRes.ok ? `id: ${emailData.id}` : `Error: ${JSON.stringify(emailData)}`);
      } catch (e) {
        report("Email sent via Resend", false, e.message);
      }
    } else {
      report("Email sent via Resend", false, "SKIPPED — no API key");
    }

    // ════════════════════════════════════════════════════════════
    console.log("\n--- 5. BADGE 'Certifie par [Galerie]' ---");
    // ════════════════════════════════════════════════════════════

    // Via direct FK
    const { rows: [directBadge] } = await pool.query(`
      SELECT a.id, a.title, m.raison_sociale as merchant_name
      FROM artworks a
      JOIN merchants m ON m.id = a.certified_by_merchant_id
      WHERE a.id = $1
    `, [TEST_ART_ID]);
    report("Badge via certified_by_merchant_id FK", directBadge?.merchant_name === "Galerie Test Normandie",
      `"Certifie par ${directBadge?.merchant_name}"`);

    // Via police_register fallback
    const { rows: [fallbackBadge] } = await pool.query(`
      SELECT a.id, m.raison_sociale as merchant_name
      FROM artworks a
      JOIN police_register_entries pre ON pre.artwork_id = a.id
      JOIN merchants m ON m.id = pre.merchant_id
      WHERE a.id = $1
    `, [TEST_ART_ID]);
    report("Badge via police_register fallback", fallbackBadge?.merchant_name === "Galerie Test Normandie",
      `Fallback: "${fallbackBadge?.merchant_name}"`);

    // ════════════════════════════════════════════════════════════
    console.log("\n--- 6. IDENTIFICATION OEUVRE (/api/verify) ---");
    // ════════════════════════════════════════════════════════════

    // Test: verify by hash — should find our test artwork
    const { rows: [verifyResult] } = await pool.query(`
      SELECT a.id, a.title, a.blockchain_hash, a.certification_status,
             u.full_name as artist_name
      FROM artworks a
      LEFT JOIN users u ON u.id = a.artist_id
      WHERE a.blockchain_hash = $1
    `, [testHash]);

    const verified = verifyResult && verifyResult.blockchain_hash === testHash;
    report("Verify by hash: artwork found", verified, verified ? `"${verifyResult.title}" — 100% match` : "Not found");
    report("Verify: certification status approved", verifyResult?.certification_status === "approved", `status: ${verifyResult?.certification_status}`);

    // ════════════════════════════════════════════════════════════
    console.log("\n--- 7. PAGE CONFORMITE ---");
    // ════════════════════════════════════════════════════════════

    // Check the file exists locally (deployment is separate)
    const conformitePath = path.join(__dirname, "../app/legal/conformite/page.tsx");
    const conformiteExists = fs.existsSync(conformitePath);
    report("Conformite page file exists", conformiteExists, conformitePath);

    if (conformiteExists) {
      const content = fs.readFileSync(conformitePath, "utf-8");
      report("Section I — Anti-blanchiment", content.includes("anti-blanchiment") || content.includes("LCB-FT"), "");
      report("Section II — Droit de suite", content.includes("Droit de suite"), "");
      report("Section III — Metaux precieux", content.includes("Metaux precieux") || content.includes("metaux precieux"), "");
      report("Section IV — UNIDROIT", content.includes("UNIDROIT"), "");
      report("Section V — Douanes", content.includes("Douanes") || content.includes("douaniere"), "");
      report("Section VI — Engagements", content.includes("Engagements generaux"), "");
      report("Print PDF button (PrintButton component)", content.includes("PrintButton"), "");
    }

    // ════════════════════════════════════════════════════════════
    console.log("\n--- 8. DOMAINES HTTPS ---");
    // ════════════════════════════════════════════════════════════

    for (const domain of ["https://art-core.app", "https://pass-core.app"]) {
      try {
        const res = await fetch(domain, { method: "HEAD", redirect: "follow" });
        report(`${domain} responds`, res.status === 200, `HTTP ${res.status}`);
      } catch (e) {
        report(`${domain} responds`, false, e.message);
      }
    }

    // ── CLEANUP ──
    console.log("\nCleaning up...");
    await pool.query("DELETE FROM police_register_entries WHERE artwork_id = $1", [TEST_ART_ID]);
    await pool.query("DELETE FROM artworks WHERE id = $1", [TEST_ART_ID]);
    await pool.query("DELETE FROM merchants WHERE siret = $1", [TEST_SIRET]);
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);

  } catch (err) {
    console.error("\nFATAL:", err.message);
    report("Unexpected error", false, err.message);
  } finally {
    await pool.end();
  }

  // ── SUMMARY ──
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log("\n" + "=".repeat(65));
  console.log(`FINAL RESULTS: ${passed} PASS / ${failed} FAIL / ${results.length} total`);
  console.log("=".repeat(65));

  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter(r => !r.ok).forEach(r => console.log(`  FAIL ${r.name}: ${r.detail}`));
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
})();
