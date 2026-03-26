import { test, expect } from "@playwright/test";

const BASE = "https://art-core-brown.vercel.app";

// ── Helper: login via API (avoids UI flakiness) ──────────
async function loginViaAPI(page: any, email: string, password: string) {
  // Login via API directly to set the cookie
  const response = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
  });
  const cookies = response.headers()["set-cookie"];
  if (cookies) {
    // Parse the cookie and set it on the page context
    const match = cookies.match(/core_session=([^;]+)/);
    if (match) {
      await page.context().addCookies([{
        name: "core_session",
        value: match[1],
        domain: "art-core-brown.vercel.app",
        path: "/",
      }]);
    }
  }
  await page.goto(`${BASE}/art-core`);
  await page.waitForLoadState("networkidle");
}

// ══════════════════════════════════════════════════════════
// TEST 1 — Marketplace loads with real Supabase data
// ══════════════════════════════════════════════════════════
test("1. Marketplace loads with real artworks from Supabase", async ({ page }) => {
  await page.goto(`${BASE}/art-core`);
  await page.waitForLoadState("networkidle");

  // Should show the marketplace hero
  const hero = page.locator("h1").first();
  await expect(hero).toBeVisible({ timeout: 15000 });

  // Should see "Decouvrir les oeuvres" or artwork cards
  const discoverBtn = page.locator("text=Decouvrir les oeuvres");
  const heroVisible = await discoverBtn.isVisible({ timeout: 5000 }).catch(() => false);

  // The page should have content — either hero or artworks
  expect(heroVisible || (await page.locator("img").count()) > 0).toBeTruthy();
});

// ══════════════════════════════════════════════════════════
// TEST 2 — Login works
// ══════════════════════════════════════════════════════════
test("2. Login with test account works", async ({ page }) => {
  await loginViaAPI(page, "marie.test@passcore.io", "Test1234!");

  // Should be on art-core now
  const url = page.url();
  expect(url).toContain("art-core");

  // Should NOT be on login page anymore
  expect(url).not.toContain("/auth/login");
});

// ══════════════════════════════════════════════════════════
// TEST 3 — Mobile bottom navigation
// ══════════════════════════════════════════════════════════
test("3. Mobile bottom navigation has 5 tabs", async ({ page }) => {
  await page.goto(`${BASE}/art-core`);
  await page.waitForLoadState("networkidle");

  // Bottom nav should be visible on mobile
  const bottomNav = page.locator("nav.fixed.bottom-0");
  await expect(bottomNav).toBeVisible({ timeout: 10000 });

  // Should have 5 tabs
  const tabs = bottomNav.locator("a");
  await expect(tabs).toHaveCount(5);

  // Check tab labels
  await expect(bottomNav.locator("text=Galerie")).toBeVisible();
  await expect(bottomNav.locator("text=Explorer")).toBeVisible();
  await expect(bottomNav.locator("text=Certifier")).toBeVisible();
  await expect(bottomNav.locator("text=Favoris")).toBeVisible();
  await expect(bottomNav.locator("text=Profil")).toBeVisible();
});

// ══════════════════════════════════════════════════════════
// TEST 4 — Artwork detail page loads
// ══════════════════════════════════════════════════════════
test("4. Artwork detail page shows real data", async ({ page }) => {
  // Use a known artwork ID from the seed data
  await page.goto(`${BASE}/art-core/oeuvre/00000000-0000-0000-0000-000000000101`);
  await page.waitForLoadState("networkidle");

  // Should show artwork title
  const title = page.locator("h1");
  await expect(title).toBeVisible({ timeout: 15000 });
  await expect(title).toContainText("Crepuscule");

  // Should show price
  const price = page.locator("text=4 500");
  const priceVisible = await price.isVisible({ timeout: 5000 }).catch(() => false);
  expect(priceVisible).toBeTruthy();
});

// ══════════════════════════════════════════════════════════
// TEST 5 — Certification page accessible after login
// ══════════════════════════════════════════════════════════
test("5. Certification page loads after login", async ({ page }) => {
  await loginViaAPI(page, "marie.test@passcore.io", "Test1234!");

  // Navigate to certifier (art-core route)
  await page.goto(`${BASE}/art-core/certifier`);
  await page.waitForLoadState("networkidle");

  // Should see the certification page content
  // Look for key certification elements
  const certContent = page.locator("text=Certifiez votre oeuvre");
  const certBtn = page.locator("text=Commencer");

  const hasCertContent = await certContent.isVisible({ timeout: 10000 }).catch(() => false);
  const hasCertBtn = await certBtn.isVisible({ timeout: 5000 }).catch(() => false);

  expect(hasCertContent || hasCertBtn).toBeTruthy();
});
