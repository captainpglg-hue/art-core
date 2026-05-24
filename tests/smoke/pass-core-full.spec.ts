import { test, expect } from "@playwright/test";

const BASE = "https://pass-core.app";

const PUBLIC_PAGES = [
  { path: "/", title: /pass|core/i },
  { path: "/pass-core", title: /pass-core/i },
  { path: "/pass-core/certifier", title: /.+/ },
  { path: "/pass-core/deposer", title: /.+/ },
  { path: "/pass-core/gallery", title: /.+/ },
  { path: "/pass-core/verifier", title: /.+/ },
  { path: "/pass-core/pro/inscription", title: /.+/ },
  { path: "/pass-core/admin/login", title: /.+/ },
  { path: "/auth/login", title: /.+/ },
  { path: "/auth/signup", title: /.+/ },
];

const PROTECTED_PAGES = [
  "/pass-core/admin",
  "/pass-core/admin/users",
];

const API_ENDPOINTS = [
  { path: "/api/health", expectedStatuses: [200] },
  { path: "/api/auth/me", expectedStatuses: [200, 401] },
  { path: "/api/blockchain/status", expectedStatuses: [200] },
  { path: "/api/admin/auth/me", expectedStatuses: [200, 401] },
  { path: "/api/admin/stats", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/users", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/export", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/certifications", expectedStatuses: [200, 401, 403] },
  { path: "/api/admin/artworks", expectedStatuses: [200, 401, 403] },
];

test.describe("pass-core public pages", () => {
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

test.describe("pass-core protected pages", () => {
  for (const path of PROTECTED_PAGES) {
    test(`GET ${path} (no auth) redirects to login`, async ({ page }) => {
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const finalUrl = page.url();
      const status = resp?.status() ?? 0;
      expect(status, `${path} status`).toBeLessThan(500);
      expect(/\/login|\/auth/i.test(finalUrl), `${path} should redirect to login, ended at ${finalUrl}`).toBe(true);
    });
  }
});

test.describe("pass-core API endpoints", () => {
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

test.describe("pass-core API content-types", () => {
  const JSON_ENDPOINTS = ["/api/health", "/api/blockchain/status"];
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

test.describe("pass-core gallery returns valid empty state or content", () => {
  test("gallery page has a heading", async ({ page }) => {
    await page.goto(`${BASE}/pass-core/gallery`, { waitUntil: "domcontentloaded" });
    const h1 = await page.locator("h1").first().textContent();
    expect(h1 || "", "gallery h1").toMatch(/galerie|certif/i);
  });
});

test.describe("pass-core certifier wizard intro step", () => {
  test("certifier page renders some interactive element", async ({ page }) => {
    await page.goto(`${BASE}/pass-core/certifier`, { waitUntil: "domcontentloaded" });
    const interactives = await page.locator("button, a[href], input, textarea").count();
    expect(interactives, "certifier should have at least 1 button/link/input").toBeGreaterThan(0);
  });
});
