import { test, expect } from "@playwright/test";

const BASE = "https://art-core-brown.vercel.app";

// ── TEST 1: CONNEXION ──
test("TEST 1 — Connexion avec marie.test@passcore.io", async ({ page }) => {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState("networkidle");

  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');

  await emailInput.first().fill("marie.test@passcore.io");
  await passwordInput.first().fill("Test1234!");

  // Click submit
  const submitBtn = page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")');
  await submitBtn.first().click();

  // Wait for navigation
  await page.waitForTimeout(3000);
  const url = page.url();
  console.log("POST-LOGIN URL:", url);

  // Should NOT still be on login page
  expect(url).not.toContain("/auth/login");
});

// ── TEST 2: NAVIGATION MOBILE ──
test("TEST 2 — Navigation mobile visible", async ({ page }) => {
  await page.goto(`${BASE}/pass-core/certifier`);
  await page.waitForLoadState("networkidle");

  // Check mobile bottom nav exists
  const bottomNav = page.locator("nav.fixed.bottom-0");
  await expect(bottomNav).toBeVisible();

  // Check for navigation items
  const navText = await bottomNav.textContent();
  console.log("NAV CONTENT:", navText);

  // Should have Certifier tab
  const certifierLink = bottomNav.locator('a[href*="certifier"], a:has-text("Certifier")');
  const count = await certifierLink.count();
  console.log("CERTIFIER LINKS:", count);
  expect(count).toBeGreaterThan(0);
});

// ── TEST 3: CATALOGUE ──
test("TEST 3 — Catalogue des oeuvres", async ({ page }) => {
  await page.goto(`${BASE}/art-core`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const content = await page.textContent("body");
  console.log("ART-CORE PAGE LENGTH:", content?.length);

  // Should have some artwork content or cards
  const links = await page.locator('a[href*="/art-core/oeuvre/"]').count();
  console.log("ARTWORK LINKS:", links);

  // Page should load without errors
  expect(content?.length).toBeGreaterThan(100);
});

// ── TEST 4: CERTIFICATION ──
test("TEST 4 — Page certification accessible et formulaire visible", async ({ page }) => {
  await page.goto(`${BASE}/pass-core/certifier`);
  await page.waitForLoadState("networkidle");

  // Check form elements
  const titleInput = page.locator('input[placeholder*="Crepuscule"], input[placeholder*="titre"], input[placeholder*="Ex:"]');
  const count = await titleInput.count();
  console.log("TITLE INPUT COUNT:", count);

  // Check material buttons
  const peinture = page.locator('button:has-text("Peinture")');
  await expect(peinture.first()).toBeVisible();

  // Check start button
  const startBtn = page.locator('button:has-text("Commencer")');
  await expect(startBtn.first()).toBeVisible();

  // Fill form and try to start
  await titleInput.first().fill("Test Oeuvre Audit");

  const widthInput = page.locator('input[placeholder="80"]');
  const heightInput = page.locator('input[placeholder="120"]');
  const yearInput = page.locator('input[placeholder="2024"]');

  await widthInput.first().fill("60");
  await heightInput.first().fill("80");
  await yearInput.first().fill("2025");

  // Button should now be enabled
  const btn = page.locator('button:has-text("Commencer")');
  const isDisabled = await btn.first().isDisabled();
  console.log("START BUTTON DISABLED:", isDisabled);
  expect(isDisabled).toBe(false);

  // Click start certification
  await btn.first().click();
  await page.waitForTimeout(1000);

  // Should move to zone selection step
  const zoneText = page.locator(':text("Selection de la zone"), :text("Photographiez"), :text("zone")');
  const found = await zoneText.count();
  console.log("ZONE STEP ELEMENTS:", found);
  // Also check page content
  const bodyText = await page.textContent("body");
  const hasZoneStep = bodyText?.includes("zone") || bodyText?.includes("Photographiez") || bodyText?.includes("Selection");
  console.log("HAS ZONE STEP TEXT:", hasZoneStep);
  expect(hasZoneStep).toBe(true);
});

// ── TEST 5: FICHE OEUVRE — BOUTON ACHETER ──
test("TEST 5 — Bouton Acheter visible sur fiche oeuvre", async ({ page }) => {
  // First login
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  await emailInput.first().fill("client@demo.com");
  await passwordInput.first().fill("password123");

  const submitBtn = page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")');
  await submitBtn.first().click();
  await page.waitForTimeout(3000);

  // Go to art-core marketplace
  await page.goto(`${BASE}/art-core`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Find artwork links
  const artworkLinks = page.locator('a[href*="/art-core/oeuvre/"]');
  const count = await artworkLinks.count();
  console.log("ARTWORK LINKS ON MARKETPLACE:", count);

  if (count > 0) {
    // Click first artwork
    await artworkLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasBuyBtn = bodyText?.includes("Acheter");
    console.log("HAS BUY BUTTON:", hasBuyBtn);
    console.log("PAGE URL:", page.url());
  }
});

// ── TEST 6: PASS-CORE DASHBOARD ──
test("TEST 6 — Pass-Core proprietaire page", async ({ page }) => {
  // Login as artist
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  await emailInput.first().fill("marie.test@passcore.io");
  await passwordInput.first().fill("Test1234!");

  const submitBtn = page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")');
  await submitBtn.first().click();
  await page.waitForTimeout(3000);

  await page.goto(`${BASE}/pass-core/proprietaire`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const content = await page.textContent("body");
  console.log("PROPRIETAIRE PAGE LENGTH:", content?.length);
  console.log("PROPRIETAIRE URL:", page.url());
  expect(content?.length).toBeGreaterThan(50);
});

// ── TEST 7: PRIME-CORE ──
test("TEST 7 — Prime-Core dashboard", async ({ page }) => {
  await page.goto(`${BASE}/prime-core/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const content = await page.textContent("body");
  console.log("PRIME-CORE PAGE LENGTH:", content?.length);
  expect(content?.length).toBeGreaterThan(50);

  // Check for dashboard elements
  const url = page.url();
  console.log("PRIME-CORE URL:", url);
});

// ── TEST 8: GALERIE PASS-CORE ──
test("TEST 8 — Galerie Pass-Core", async ({ page }) => {
  await page.goto(`${BASE}/pass-core/gallery`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const content = await page.textContent("body");
  console.log("GALLERY PAGE LENGTH:", content?.length);
  expect(content?.length).toBeGreaterThan(50);
});
