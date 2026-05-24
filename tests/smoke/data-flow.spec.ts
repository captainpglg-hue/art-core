import { test, expect } from "@playwright/test";

// ============================================================================
// data-flow.spec.ts
// ----------------------------------------------------------------------------
// Tests DATA FLOW (et pas seulement "page charge sans 500").
// Détecte les cas où la base est vide ou la table n'existe pas — donc page
// vide qui passait les smoke tests précédents.
// ============================================================================

const ART = "https://art-core.app";
const PASS = "https://pass-core.app";
const PRIME = process.env.PRIME_CORE_URL || "https://prime-core.app";

test.describe("art-core data flow", () => {
  test("/api/artworks returns a non-empty list (or fails clearly if empty)", async ({ request }) => {
    const r = await request.get(`${ART}/api/artworks`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    const list = body.artworks || body;
    expect(Array.isArray(list), "/api/artworks should return an array").toBe(true);
    // Documenter clairement si vide
    expect(
      list.length,
      `/api/artworks returned 0 artworks. Soit la base est vide, soit RLS bloque la lecture publique. Vérifier table artworks + policies.`
    ).toBeGreaterThan(0);
  });

  test("boutique page shows at least 1 artwork card", async ({ page }) => {
    await page.goto(`${ART}/art-core/boutique`, { waitUntil: "domcontentloaded" });
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasEmpty = /aucune\s+oeuvre|empty|rien\s+à\s+afficher/i.test(bodyText);
    expect(
      hasEmpty,
      `Boutique affiche un empty state. Soit aucune œuvre 'for_sale', soit query filtre trop strictement.`
    ).toBe(false);
  });

  test("search returns at least 1 result on a generic query", async ({ request }) => {
    const r = await request.get(`${ART}/api/search?q=art`);
    expect(r.status()).toBeLessThan(500);
    if (r.status() === 200) {
      const body = await r.json();
      const results = body.results || body.artworks || body;
      if (Array.isArray(results)) {
        expect(
          results.length,
          "Search 'art' returned 0 results. La base est vide ou l'endpoint search filtre mal."
        ).toBeGreaterThan(0);
      }
    }
  });
});

test.describe("pass-core data flow", () => {
  test("gallery shows at least 1 certified artwork (or document the empty state)", async ({ page }) => {
    await page.goto(`${PASS}/pass-core/gallery`, { waitUntil: "domcontentloaded" });
    const h1 = await page.locator("h1").first().textContent();
    expect(h1 || "").toMatch(/galerie\s+certif/i);
    const count = await page.locator("img").count();
    // Ne fail PAS si vide — on documente seulement
    test.info().annotations.push({
      type: "data-state",
      description: `pass-core gallery: ${count} images affichées. 0 = aucune œuvre certifiée encore.`,
    });
  });
});

test.describe("prime-core data flow", () => {
  test("/api/markets returns at least 1 market (REQUIRES migration 20260524000000 applied)", async ({ request }) => {
    const r = await request.get(`${PRIME}/api/markets`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.markets), "/api/markets shape").toBe(true);
    expect(
      body.markets.length,
      [
        "/api/markets retourne 0 marchés.",
        "Cause probable : la table betting_markets n'existe pas en Supabase OU le seed n'a pas été appliqué.",
        "Action : appliquer la migration art-core/supabase/migrations/20260524000000_prime_core_betting_markets.sql",
        "via le dashboard Supabase (SQL Editor) ou supabase db push.",
      ].join("\n")
    ).toBeGreaterThan(0);
  });

  test("dashboard shows market cards (not just an empty state)", async ({ page }) => {
    await page.goto(`${PRIME}/prime-core/dashboard`, { waitUntil: "domcontentloaded" });
    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText, "dashboard should mention Marchés Prédictifs").toMatch(/marchés\s+prédictifs/i);

    // Stats : "Marchés ouverts" doit montrer > 0
    const openMatch = bodyText.match(/Marchés ouverts[^\d]*(\d+)/);
    const openCount = openMatch ? Number(openMatch[1]) : 0;
    expect(
      openCount,
      `Dashboard affiche ${openCount} marchés ouverts. Migration betting_markets non appliquée ? cf. /api/markets test ci-dessus.`
    ).toBeGreaterThan(0);
  });

  test("leaderboard page renders without 500", async ({ page }) => {
    const r = await page.goto(`${PRIME}/prime-core/leaderboard`, { waitUntil: "domcontentloaded" });
    expect(r?.status() ?? 0).toBeLessThan(500);
    // Pas d'assertion stricte sur le contenu : le leaderboard peut être vide si 0 paris
  });
});

test.describe("art-core <-> prime-core data sharing", () => {
  test("certified artwork in art-core appears as artwork_title in prime-core market", async ({ request }) => {
    const r1 = await request.get(`${ART}/api/artworks?status=for_sale&limit=5`);
    if (r1.status() !== 200) test.skip(true, "art-core /api/artworks not available");
    const arts = await r1.json();
    const list = arts.artworks || arts;
    if (!Array.isArray(list) || list.length === 0) {
      test.skip(true, "no artworks in art-core to cross-reference");
    }

    const r2 = await request.get(`${PRIME}/api/markets?limit=5`);
    if (r2.status() !== 200) test.skip(true, "prime-core /api/markets not available");
    const markets = (await r2.json()).markets;
    if (!Array.isArray(markets) || markets.length === 0) {
      test.skip(true, "no markets in prime-core (migration not applied?)");
    }

    // Au moins 1 marché doit avoir un artwork_title rempli (preuve que les 2 apps partagent la même DB)
    const withTitle = markets.filter((m: { artwork_title?: string | null }) => m.artwork_title);
    expect(
      withTitle.length,
      "Aucun marché prime-core n'a d'artwork_title. Soit la DB est différente, soit l'enrichissement REST échoue."
    ).toBeGreaterThan(0);
  });
});
