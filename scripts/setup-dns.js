/**
 * ═══════════════════════════════════════════════════
 * ART-CORE — Configuration DNS automatique sur Gandi
 * ═══════════════════════════════════════════════════
 *
 * Usage: node scripts/setup-dns.js VOTRE_CLE_API_GANDI
 *
 * Pour obtenir la cle API :
 * 1. https://admin.gandi.net
 * 2. Cliquez sur votre nom (pglg) en haut a droite
 * 3. "User settings" ou "Parametres"
 * 4. Section "Developer" > "Personal Access Tokens"
 * 5. "Create a token" > copiez la cle
 */

const DOMAIN = "art-core.app";
const API = "https://api.gandi.net/v5/livedns";

const RECORDS = [
  { name: "@", type: "A", values: ["76.76.21.21"], ttl: 300 },
  { name: "www", type: "CNAME", values: ["cname.vercel-dns.com."], ttl: 300 },
  { name: "pass-core", type: "CNAME", values: ["cname.vercel-dns.com."], ttl: 300 },
  { name: "prime-core", type: "CNAME", values: ["cname.vercel-dns.com."], ttl: 300 },
];

async function run() {
  const apiKey = process.argv[2];
  if (!apiKey) {
    console.error("\n❌ Usage: node scripts/setup-dns.js VOTRE_CLE_API\n");
    console.error("Pour obtenir la cle :");
    console.error("1. https://admin.gandi.net");
    console.error("2. Cliquez sur pglg en haut a droite");
    console.error("3. User settings > Developer > Personal Access Tokens");
    console.error("4. Create a token > copiez la cle\n");
    process.exit(1);
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  console.log(`\n🔧 Configuration DNS pour ${DOMAIN}...\n`);

  // Check domain access
  const check = await fetch(`${API}/domains/${DOMAIN}`, { headers });
  if (!check.ok) {
    const err = await check.json().catch(() => ({}));
    console.error(`❌ Impossible d'acceder au domaine: ${err.message || check.statusText}`);
    console.error("Verifiez votre cle API.\n");
    process.exit(1);
  }
  console.log(`✅ Acces au domaine ${DOMAIN} confirme\n`);

  // Delete conflicting records first
  for (const rec of RECORDS) {
    const delUrl = `${API}/domains/${DOMAIN}/records/${rec.name}/${rec.type}`;
    const delRes = await fetch(delUrl, { method: "DELETE", headers });
    if (delRes.ok) {
      console.log(`🗑️  Ancien ${rec.type} ${rec.name} supprime`);
    }
  }

  // Create new records
  let success = 0;
  for (const rec of RECORDS) {
    const url = `${API}/domains/${DOMAIN}/records/${rec.name}/${rec.type}`;
    const body = {
      rrset_values: rec.values,
      rrset_ttl: rec.ttl,
    };

    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok || res.status === 201) {
      console.log(`✅ ${rec.type.padEnd(5)} ${rec.name.padEnd(12)} → ${rec.values[0]}`);
      success++;
    } else {
      const err = await res.json().catch(() => ({}));
      console.error(`❌ ${rec.type} ${rec.name} — ${err.message || res.statusText}`);
    }
  }

  console.log(`\n${"═".repeat(50)}`);
  if (success === 4) {
    console.log("✅ 4/4 enregistrements configures !\n");
    console.log("Propagation en cours (30 min a 2h)...\n");
    console.log("Vos adresses :");
    console.log("  🎨 art-core.app              → Marketplace");
    console.log("  🔒 pass-core.art-core.app     → Certification");
    console.log("  🏆 prime-core.art-core.app    → Points & Paris\n");
  } else {
    console.log(`⚠️  ${success}/4 enregistrements configures. Verifiez les erreurs.\n`);
  }
}

run().catch(e => console.error("Erreur:", e.message));
