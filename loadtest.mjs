// =============================================================================
// loadtest.mjs — Load test fiches police via pass-core /api/deposit-with-signup
// Usage:
//   node loadtest.mjs pilot     -> 1 user per role, 3 deposits each (3 users, 9 deposits, 6 emails)
//   node loadtest.mjs full      -> 100 users per role, 3 deposits each (300 users, 900 deposits, 600 emails)
//   node loadtest.mjs cleanup   -> print SQL to delete all rows tagged
//
// Idempotent : usernames + emails uses fixed timestamp tag, re-run skips existing.
// =============================================================================
import crypto from "node:crypto";

const PASS_CORE = "https://pass-core.app";
// Fixed timestamp for this whole load test campaign — deliberately stable.
// Re-run picks up where it left off (skips users that already exist).
const TS = "20260429023000";
const TAG = `loadtest-${TS}`;

const MODE = process.argv[2] || "pilot";
const PILOT = MODE === "pilot";
const SMOKE = MODE === "smoke";
const CLEANUP = MODE === "cleanup";
const ARTWORKS_PER_USER = SMOKE ? 1 : 3;
const THROTTLE_MS = parseInt(process.env.THROTTLE_MS || "500", 10);
const PASSWORD = "LoadTest2026!demo";

// Smoke = 5 users per role × 1 oeuvre. Pilot = 1 user × 3 oeuvres. Full = 100 × 3.
const PER_ROLE = SMOKE ? 5 : (PILOT ? 1 : 100);

const ROLES = [
  { role: "galeriste",   isPro: true,  sirePrefix: "9999990001", count: PER_ROLE },
  { role: "antiquaire",  isPro: true,  sirePrefix: "9999990003", count: SMOKE ? PER_ROLE : 0 },
  { role: "brocanteur",  isPro: true,  sirePrefix: "9999990002", count: PER_ROLE },
  { role: "depot_vente", isPro: true,  sirePrefix: "9999990004", count: SMOKE ? PER_ROLE : 0 },
  { role: "artist",      isPro: false, sirePrefix: null,          count: PER_ROLE },
].filter((r) => r.count > 0);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const userEmail = (role, idx) => `captainpglg+${TAG}-${role}-${String(idx).padStart(3, "0")}@gmail.com`;
const genSiret = (prefix10, idx) => prefix10 + String(idx).padStart(4, "0");
const photo = (role, u, a) => `https://picsum.photos/seed/${TAG}-${role}-${u}-art${a}/800/600`;

if (CLEANUP) {
  console.log(`-- Cleanup SQL for ${TAG}`);
  console.log(`DELETE FROM police_register_entries WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'captainpglg+${TAG}-%');`);
  console.log(`DELETE FROM artworks WHERE artist_id IN (SELECT id FROM users WHERE email LIKE 'captainpglg+${TAG}-%');`);
  console.log(`DELETE FROM pass_core WHERE current_owner_id IN (SELECT id FROM users WHERE email LIKE 'captainpglg+${TAG}-%');`);
  console.log(`DELETE FROM seller_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'captainpglg+${TAG}-%');`);
  console.log(`DELETE FROM merchants WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'captainpglg+${TAG}-%');`);
  console.log(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'captainpglg+${TAG}-%');`);
  console.log(`DELETE FROM magic_links WHERE email LIKE 'captainpglg+${TAG}-%';`);
  console.log(`DELETE FROM users WHERE email LIKE 'captainpglg+${TAG}-%';`);
  process.exit(0);
}

console.log(`Mode=${MODE} Tag=${TAG} Throttle=${THROTTLE_MS}ms`);
console.log(`Plan: ${ROLES.map((r) => `${r.count} ${r.role}`).join(", ")}, ${ARTWORKS_PER_USER} oeuvres each`);
const totalDeposits = ROLES.reduce((s, r) => s + r.count, 0) * ARTWORKS_PER_USER;
const totalEmails = ROLES.filter((r) => r.isPro).reduce((s, r) => s + r.count, 0) * ARTWORKS_PER_USER;
console.log(`Expected: ${totalDeposits} deposits, ${totalEmails} fiches police\n`);

async function postDeposit(payload, cookie) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = `core_session=${cookie}`;
  const resp = await fetch(`${PASS_CORE}/api/deposit-with-signup`, {
    method: "POST", headers, body: JSON.stringify(payload),
  });
  let body;
  try { body = await resp.json(); } catch { body = { error: "non-json", raw: await resp.text().catch(() => "") }; }
  const setCookie = resp.headers.get("set-cookie") || "";
  const m = /core_session=([^;]+)/.exec(setCookie);
  return { status: resp.status, body, sessionCookie: m ? m[1] : null };
}

const stats = { attempted: 0, depositOk: 0, emailOk: 0, depositErr: 0, emailErr: 0, retries: 0 };
const errorLog = [];
const startedAt = Date.now();

for (const cfg of ROLES) {
  for (let i = 1; i <= cfg.count; i++) {
    const email = userEmail(cfg.role, i);
    let cookie = null;
    let userExists = false;

    for (let a = 1; a <= ARTWORKS_PER_USER; a++) {
      stats.attempted++;
      const artwork = {
        title: `LT ${cfg.role.toUpperCase()} ${String(i).padStart(3, "0")}/${a}`,
        description: `Load test deposit (run ${TS})`,
        technique: "test",
        dimensions: "10x10 cm",
        creation_date: "2025",
        category: "painting",
        price: 100,
        photos: [photo(cfg.role, i, a)],
        is_public: false,
      };
      const payload = { artwork };
      if (a === 1) {
        payload.identity = {
          email, password: PASSWORD,
          full_name: `LT ${cfg.role} ${i}`,
          username: `lt_${cfg.role.slice(0, 3)}_${i}_${TS.slice(-6)}`,
          role: cfg.role,
        };
        if (cfg.isPro) {
          payload.merchant = {
            raison_sociale: `LT ${cfg.role} ${i}`,
            siret: genSiret(cfg.sirePrefix, i),
            activite: cfg.role,
            nom_gerant: `LT Gerant ${i}`,
            adresse: "1 rue Test",
            code_postal: "75001",
            ville: "Paris",
            cahier_police: ["antiquaire", "brocanteur", "depot_vente"].includes(cfg.role),
          };
        }
      }

      let attempt = 0;
      const maxRetries = 3;
      while (attempt < maxRetries) {
        attempt++;
        try {
          const r = await postDeposit(payload, cookie);
          if (r.status === 200 && r.body?.success) {
            stats.depositOk++;
            const fp = r.body.fiche_police;
            if (fp?.email_sent) stats.emailOk++;
            else if (fp && fp.triggered === false) stats.emailErr++;
            else if (fp && fp.triggered && !fp.email_sent) stats.emailErr++;
            if (a === 1 && r.sessionCookie) cookie = r.sessionCookie;
            userExists = true;
            console.log(`OK ${cfg.role}-${i}/${a} entry=${fp?.entry_number ?? "-"} email=${fp?.email_sent ? "Y" : "N"}`);
            break;
          }
          if (a === 1 && r.status === 409 && r.body?.error?.includes("déjà utilisé")) {
            console.log(`SKIP ${cfg.role}-${i}/${a} user exists (idempotent run)`);
            stats.depositOk++;
            userExists = true;
            break;
          }
          if (r.status === 429) {
            const wait = Math.min(60000, 2000 * attempt * attempt);
            stats.retries++;
            console.log(`RATELIMIT ${cfg.role}-${i}/${a} attempt=${attempt} wait=${wait}ms`);
            await sleep(wait);
            continue;
          }
          stats.depositErr++;
          errorLog.push({ role: cfg.role, i, a, status: r.status, error: r.body?.error || JSON.stringify(r.body).slice(0, 150) });
          console.log(`ERR ${cfg.role}-${i}/${a} status=${r.status} ${r.body?.error || ""}`);
          break;
        } catch (e) {
          stats.depositErr++;
          errorLog.push({ role: cfg.role, i, a, error: e.message });
          console.log(`EXC ${cfg.role}-${i}/${a} ${e.message}`);
          break;
        }
      }

      if (a === 1 && !cookie && !userExists) break;
      if (a === 1 && !cookie && userExists) break;
      await sleep(THROTTLE_MS);
    }
  }
}

const elapsed = Math.round((Date.now() - startedAt) / 1000);
console.log(`\n=== DONE in ${elapsed}s ===`);
console.log(`Attempted:    ${stats.attempted}`);
console.log(`Deposits ok:  ${stats.depositOk}`);
console.log(`Fiches sent:  ${stats.emailOk} / ${totalEmails} expected`);
console.log(`Email errors: ${stats.emailErr}`);
console.log(`Deposit errs: ${stats.depositErr}`);
console.log(`Retries:      ${stats.retries}`);
console.log(`Tag for cleanup: ${TAG}`);
if (errorLog.length) {
  console.log(`\nFirst ${Math.min(10, errorLog.length)} errors:`);
  for (const e of errorLog.slice(0, 10)) console.log("  " + JSON.stringify(e));
}
