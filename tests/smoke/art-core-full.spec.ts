import { test, expect } from "@playwright/test";

const BASE = "https://art-core.app";

// pages publiques (pas de redirect d'auth attendu)
const PUBLIC_PAGES = [
  { path: "/", title: /art|core|hub/i },
  { path: "/art-core", title: /art-core/i },
  { path: "/art-core/about", title: /.+/ },
  { path: "/art-core/boutique", title: /.+/ },
  { path: "/art-core/boutique-promotion", title: /.+/ },
  { path: "/art-core/certifier", title: /.+/ },
  { path: "/art-core/deposer", title: /.+/ },
  { path: "/art-core/faq", title: /.+/ },
  { path: "/art-core/search", title: /.+/ },
  { path: "/art-core/admin/login", title: /.+/ },
  { path: "/auth/login", title: /.+/ },
  { path: "/auth/signup", title: /.+/ },
];

// pages qui DOIVENT rediriger un visiteur non-loggé vers /auth/login
const PROTECTED_PAGES = [
  "/art-core/dashboard",
  "/art-core/profile",
  "/art-core/favoris",
  "/art-core/orders",
  "/art-core/notifications",
  "/art-core/messages",
  "/art-core/wallet",
  "/art-core/initie",
  "/art-core/cahier-police",
  "/art-core/checkout",
];

// endpoints API : on accepte 200/401 mais pas 500
const API_ENDPOINTS = [
  { path: "/api/health", expectedStatuses: [200] },
  { path: "/api/auth/me", expectedStatuses: [200, 401] },
  { path: "/api/artworks", expectedStatuses: [200] },
  { path: "/api/search", expectedStatuses: [200, 400] },
  { path: "/api/promo/active", expectedStatuses: [200] },
  { path: "/api/notifications", expectedStatuses: [200, 401] },
  { path: "/api/messages", expectedStatuses: [200, 401] },
  { path: "/api/favorites", expectedStatuses: [200, 401] },
  { path: "/api/wallet", expectedStatuses: [200, 401] },
  // /api/profile only has PUT, no GET
  { path: "/api/admin/stats", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/users", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/export", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/certifications", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/fiches-pending", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/auth/me", expectedStatuses: [200, 401] },
  { path: "/api/certification", expectedStatuses: [200, 401, 403] },
  { path: "/api/merchants/me", expectedStatuses: [200, 401] },
  { path: "/api/seller-profile", expectedStatuses: [200, 401] },
  { path: "/api/stripe/connect/status", expectedStatuses: [200, 401] },
];

test.describe("art-core public pages", () => {
  for (const { path, title } of PUBLIC_PAGES) {
    test(`GET ${path} renders without 5xx`, async ({ page }) => {
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const status = resp?.status() ?? 0;
      expect(status, `${path} returned ${status}`).toBeLessThan(500);
      const bodyText = await page.locator("body").innerText().catch(() => "");
      expect(bodyText.length, `${path} body should have content`).toBeGreaterThan(20);
      const t = await page.title();
      expect(t, `${path} title should match ${title}`).toMatch(title);
    });
  }
});

test.describe("art-core protected pages redirect to /auth/login", () => {
  for (const path of PROTECTED_PAGES) {
    test(`GET ${path} (no auth) redirects to /auth/login`, async ({ page }) => {
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const finalUrl = page.url();
      const status = resp?.status() ?? 0;
      expect(status, `${path} status`).toBeLessThan(500);
      const isLoginRedirect = /\/auth\/login/i.test(finalUrl);
      expect(isLoginRedirect, `${path} should redirect to /auth/login, ended at ${finalUrl}`).toBe(true);
    });
  }
});

test.describe("art-core API endpoints", () => {
  for (const { path, expectedStatuses } of API_ENDPOINTS) {
    test(`GET ${path}`, async ({ request }) => {
      const resp = await request.get(`${BASE}${path}`);
      const status = resp.status();
      expect(
        expectedStatuses.includes(status),
        `${path} returned ${status}, expected one of ${expectedStatuses.join(",")}`
      ).toBe(true);
    });
  }
});

test.describe("art-core API content-types", () => {
  const JSON_ENDPOINTS = ["/api/health", "/api/artworks", "/api/promo/active"];
  for (const path of JSON_ENDPOINTS) {
    test(`${path} returns JSON`, async ({ request }) => {
      const resp = await request.get(`${BASE}${path}`);
      if (resp.status() < 400) {
        const ct = resp.headers()["content-type"] || "";
        expect(ct, `${path} content-type`).toContain("json");
      }
    });
  }
});

test.describe("art-core home internal links", () => {
  test("home page has navigable links to key pages", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const hrefs = await page.locator("a[href]").evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute("href")).filter(Boolean)
    );
    expect(hrefs.length, "should have at least 1 link").toBeGreaterThan(0);
  });
});
