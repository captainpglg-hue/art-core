import { test, expect } from "@playwright/test";

// Cible : domaine prod si configuré, sinon fresh-core-app preview
const TARGET = process.env.PRIME_CORE_URL || "https://prime-core.app";

const PAGES = [
  { path: "/", titleHint: /PRIME-CORE|prime|marché/i },
  { path: "/prime-core/dashboard", titleHint: /PRIME-CORE|prime/i },
  { path: "/prime-core/leaderboard", titleHint: /PRIME-CORE|prime/i },
  { path: "/prime-core/scout", titleHint: /PRIME-CORE|prime/i },
];

const API_ENDPOINTS = [
  { path: "/api/markets", expectedStatuses: [200] },
  { path: "/api/markets?status=open", expectedStatuses: [200] },
  { path: "/api/markets?status=open&limit=5", expectedStatuses: [200] },
  { path: "/api/markets?limit=1", expectedStatuses: [200] },
];

test.describe(`prime-core pages (${TARGET})`, () => {
  for (const { path, titleHint } of PAGES) {
    test(`GET ${path}`, async ({ page }) => {
      const resp = await page.goto(`${TARGET}${path}`, { waitUntil: "domcontentloaded" });
      const status = resp?.status() ?? 0;
      expect(status, `${path} returned ${status}`).toBeLessThan(500);
      const t = await page.title();
      expect(t, `${path} title must contain PRIME-CORE marker — got "${t}"`).toMatch(titleHint);
    });
  }

  for (const { path, expectedStatuses } of API_ENDPOINTS) {
    test(`GET ${path}`, async ({ request }) => {
      const resp = await request.get(`${TARGET}${path}`);
      const status = resp.status();
      expect(
        expectedStatuses.includes(status),
        `${path} returned ${status}, expected one of ${expectedStatuses.join(",")}`
      ).toBe(true);
      if (status === 200) {
        const ct = resp.headers()["content-type"] || "";
        expect(ct, `${path} content-type`).toContain("json");
        const body = await resp.json();
        expect(body, "body should have markets key").toHaveProperty("markets");
      }
    });
  }
});

test.describe("prime-core dashboard interactive content", () => {
  test("dashboard has stats/markets layout", async ({ page }) => {
    const resp = await page.goto(`${TARGET}/prime-core/dashboard`, { waitUntil: "domcontentloaded" });
    expect(resp?.status()).toBeLessThan(500);
    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.length, "dashboard body").toBeGreaterThan(50);
    expect(bodyText, "dashboard should mention markets/prédictions/paris").toMatch(/marché|paris|prédiction|bet|market/i);
  });
});
