// =============================================================================
// SCRIPT À COLLER DANS LA CONSOLE DEVTOOLS DE TON NAVIGATEUR
// =============================================================================
// Pré-requis : être connecté à Vercel dans l'onglet où tu colles le script.
//
// Comment l'utiliser :
//   1. Sur la page Vercel ouverte, appuie sur F12 (ou Ctrl+Shift+I) pour
//      ouvrir DevTools
//   2. Va dans l'onglet "Console"
//   3. Si une bannière dit "Don't paste code...", tape exactement
//      "allow pasting" puis Entrée
//   4. Colle TOUT le bloc ci-dessous, puis Entrée
//   5. Suis les instructions affichées dans la console
// =============================================================================

(async () => {
  const PASS_CORE_PROJECT = "pass-core-final";
  const ART_CORE_PROJECT = "art-core-final";
  const TEAM_SLUG = "captainpglg-hues-projects";

  console.log("%c🔑 Copie de RESEND_API_KEY de pass-core-final vers art-core-final", "color:#D4AF37;font-weight:bold;font-size:14px");

  // 1) Trouver le teamId
  let teamId = null;
  try {
    const teamRes = await fetch(`https://vercel.com/api/v2/teams/${TEAM_SLUG}`, { credentials: "include" });
    const teamJson = await teamRes.json();
    teamId = teamJson?.id;
    if (!teamId) throw new Error("teamId introuvable");
    console.log("✓ teamId =", teamId);
  } catch (e) {
    console.error("❌ Impossible de récupérer le teamId :", e.message);
    console.log("💡 Vérifie que tu es bien connecté à Vercel et que tu as accès à l'organisation captainpglg-hues-projects.");
    return;
  }

  // 2) Récupérer les projectIds
  async function getProjectId(slug) {
    const r = await fetch(`https://vercel.com/api/v9/projects/${slug}?teamId=${teamId}`, { credentials: "include" });
    if (!r.ok) throw new Error(`Projet ${slug} introuvable (HTTP ${r.status})`);
    const j = await r.json();
    return j?.id;
  }

  let passCoreId, artCoreId;
  try {
    passCoreId = await getProjectId(PASS_CORE_PROJECT);
    artCoreId = await getProjectId(ART_CORE_PROJECT);
    console.log("✓ pass-core-final =", passCoreId);
    console.log("✓ art-core-final  =", artCoreId);
  } catch (e) {
    console.error("❌", e.message);
    return;
  }

  // 3) Lire RESEND_API_KEY de pass-core-final (decrypt = true)
  let resendValue = null;
  try {
    const r = await fetch(
      `https://vercel.com/api/v9/projects/${passCoreId}/env?decrypt=true&teamId=${teamId}`,
      { credentials: "include" }
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const envs = j?.envs || j;
    const row = (Array.isArray(envs) ? envs : []).find(e => e.key === "RESEND_API_KEY");
    if (!row) throw new Error("RESEND_API_KEY introuvable sur pass-core-final");
    resendValue = row.value;
    if (!resendValue) throw new Error("Valeur vide (la decryption a peut-être échoué)");
    console.log("✓ RESEND_API_KEY trouvée sur pass-core-final (preview :", resendValue.slice(0, 6) + "...)");
  } catch (e) {
    console.error("❌ Lecture pass-core-final échoue :", e.message);
    console.log("💡 Vérifie sur https://vercel.com/" + TEAM_SLUG + "/" + PASS_CORE_PROJECT + "/settings/environment-variables que RESEND_API_KEY existe bien.");
    return;
  }

  // 4) Vérifier si RESEND_API_KEY existe déjà sur art-core-final
  let existingArtCoreEnv = null;
  try {
    const r = await fetch(
      `https://vercel.com/api/v9/projects/${artCoreId}/env?teamId=${teamId}`,
      { credentials: "include" }
    );
    const j = await r.json();
    const envs = j?.envs || j;
    existingArtCoreEnv = (Array.isArray(envs) ? envs : []).find(e => e.key === "RESEND_API_KEY");
  } catch (e) {
    console.warn("Lecture art-core-final non-bloquant :", e.message);
  }

  // 5) Pose la valeur sur art-core-final
  try {
    const payload = {
      key: "RESEND_API_KEY",
      value: resendValue,
      type: "encrypted",
      target: ["production", "preview", "development"],
    };

    let action;
    if (existingArtCoreEnv) {
      // Update existant
      action = "update";
      const r = await fetch(
        `https://vercel.com/api/v9/projects/${artCoreId}/env/${existingArtCoreEnv.id}?teamId=${teamId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: resendValue, target: ["production", "preview", "development"] }),
        }
      );
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`PATCH ${r.status} : ${t.slice(0, 200)}`);
      }
    } else {
      action = "create";
      const r = await fetch(
        `https://vercel.com/api/v10/projects/${artCoreId}/env?teamId=${teamId}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`POST ${r.status} : ${t.slice(0, 200)}`);
      }
    }
    console.log(`✓ RESEND_API_KEY ${action === "update" ? "mise à jour" : "ajoutée"} sur art-core-final`);
  } catch (e) {
    console.error("❌ Pose sur art-core-final échoue :", e.message);
    return;
  }

  // 6) Trigger un redeploy d'art-core-final
  try {
    // Lister les déploiements récents pour récupérer l'ID du dernier prod
    const dr = await fetch(
      `https://vercel.com/api/v6/deployments?projectId=${artCoreId}&teamId=${teamId}&limit=1&target=production`,
      { credentials: "include" }
    );
    const dj = await dr.json();
    const lastDep = (dj?.deployments || [])[0];
    if (!lastDep?.uid) throw new Error("Pas de déploiement précédent trouvé");

    // Trigger un nouveau déploiement basé sur le précédent (sans cache)
    const newRes = await fetch(
      `https://vercel.com/api/v13/deployments?teamId=${teamId}&forceNew=1`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ART_CORE_PROJECT,
          deploymentId: lastDep.uid,
          target: "production",
        }),
      }
    );
    if (!newRes.ok) {
      const t = await newRes.text();
      throw new Error(`POST deployment ${newRes.status} : ${t.slice(0, 300)}`);
    }
    const newDep = await newRes.json();
    console.log(`✓ Nouveau déploiement lancé : ${newDep?.id || newDep?.url}`);
    console.log(`💡 Suis l'avancement : https://vercel.com/${TEAM_SLUG}/${ART_CORE_PROJECT}/deployments`);
  } catch (e) {
    console.error("⚠ Redeploy automatique échoué :", e.message);
    console.log(`💡 Va sur https://vercel.com/${TEAM_SLUG}/${ART_CORE_PROJECT}/deployments et clique 'Redeploy' sur le dernier déploiement (sans cache).`);
  }

  console.log("%c✅ Terminé. Compte 90 secondes que Vercel reconstruise art-core-final.", "color:#3eb55a;font-weight:bold;font-size:14px");
})();
