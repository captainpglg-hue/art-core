// E2E test : 5 scenarios de depot avec signup integre.
// Usage : node scripts/e2e-deposit-with-signup.mjs

const BASE = process.env.E2E_BASE || "https://art-core.app";
const RUN_ID = Date.now();

const SCENARIOS = [
  { role: "artist",      label: "Artiste",      needsMerchant: false, cahier: false },
  { role: "galeriste",   label: "Galeriste",    needsMerchant: true,  cahier: true  },
  { role: "antiquaire",  label: "Antiquaire",   needsMerchant: true,  cahier: true  },
  { role: "brocanteur",  label: "Brocanteur",   needsMerchant: true,  cahier: true  },
  { role: "depot_vente", label: "Depot-vente",  needsMerchant: true,  cahier: true  },
];

function fakeSiret() {
  return "9999999" + String(Math.floor(Math.random() * 10000000)).padStart(7, "0");
}

const accounts = [];
const results = [];

for (const s of SCENARIOS) {
  const suffix = `${RUN_ID}_${s.role}`;
  const email = `e2e_${suffix}@test.local`;
  const username = `e2e_${suffix}`.slice(0, 30);
  const password = `TestE2E_${RUN_ID}!`;
  const siret = fakeSiret();

  const payload = {
    identity: {
      role: s.role,
      full_name: `Test E2E ${s.label}`,
      username,
      email,
      password,
      telephone: "+33600000000",
    },
    artwork: {
      title: `Oeuvre E2E ${s.label} ${RUN_ID}`,
      price: 1500,
      category: "painting",
      technique: "Huile sur toile",
      dimensions: "60x80 cm",
      description: `Test E2E automatique ${s.role}`,
      photos: [`https://placehold.co/600x800/1a1a1a/d4af37?text=${s.role}`],
    },
  };

  if (s.needsMerchant) {
    payload.merchant = {
      raison_sociale: `E2E ${s.label} ${RUN_ID}`,
      siret,
      nom_gerant: "Gerant Test",
      adresse: "1 rue du Test",
      code_postal: "75001",
      ville: "Paris",
      cahier_police: s.cahier,
    };
  }

  console.log(`\n===== ${s.label} (${s.role}) =====`);
  console.log(`  email=${email} username=${username}${s.needsMerchant ? ` siret=${siret}` : ""}`);

  let httpCode = 0;
  let body = null;
  try {
    const resp = await fetch(`${BASE}/api/deposit-with-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    httpCode = resp.status;
    body = await resp.json().catch(() => ({}));
  } catch (e) {
    console.log(`  NETWORK ERROR: ${e.message}`);
    results.push({ role: s.role, ok: false, http: 0, error: e.message });
    continue;
  }

  console.log(`  HTTP ${httpCode}`);
  if (httpCode === 200) {
    console.log(`  user=${body.user_id} merchant=${body.merchant_id || "(aucun)"} artwork=${body.artwork_id}`);
    if (body.fiche_police?.triggered) console.log(`  fiche_police=N°${body.fiche_police.entry_number} email=${body.fiche_police.email_sent ? "envoye" : "non envoye"}`);
    if (body.warnings?.length) console.log(`  warnings: ${body.warnings.join(" | ")}`);
    accounts.push({
      role: s.role, email, password,
      user_id: body.user_id, merchant_id: body.merchant_id, artwork_id: body.artwork_id,
    });
    results.push({ role: s.role, ok: true, http: httpCode, ...body });
  } else {
    console.log(`  ECHEC body: ${JSON.stringify(body).slice(0, 400)}`);
    results.push({ role: s.role, ok: false, http: httpCode, body });
  }
}

console.log(`\n===== VERIFICATION CATALOGUE art-core =====`);
try {
  const cat = await fetch(`${BASE}/api/artworks?limit=50`).then(r => r.json());
  const e2eItems = (cat.artworks || []).filter(a => String(a.title || "").includes("E2E"));
  for (const a of e2eItems) {
    const role = a.artist_role || "?";
    const display = a.merchant_raison_sociale || a.artist_name || "(inconnu)";
    console.log(`  ${a.title}\n    role=${role} display="${display}"`);
  }
  console.log(`  ${e2eItems.length} oeuvre(s) E2E visible(s) sur le catalogue.`);
} catch (e) {
  console.log(`  GET catalogue ERROR: ${e.message}`);
}

console.log(`\n===== COMPTES E2E LAISSES EN DB =====`);
for (const a of accounts) {
  console.log(`  ${a.role.padEnd(12)} | ${a.email} | mdp: ${a.password} | user=${a.user_id} artwork=${a.artwork_id}`);
}

const ok = results.filter(r => r.ok).length;
const total = results.length;
console.log(`\n===== RESULTAT : ${ok}/${total} =====`);
process.exit(ok === total ? 0 : 1);
