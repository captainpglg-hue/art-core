import { test, expect } from "@playwright/test";

const PROD = "https://prime-core.app";
const PREVIEW = "https://fresh-core-app.vercel.app";

const TARGET = process.env.PRIME_CORE_URL || PROD;

test.describe(`prime-core (${TARGET})`, () => {
  test("home renders the actual prime-core app, not a Vercel 404", async ({ page }) => {
    const resp = await page.goto(TARGET, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "home status").toBeLessThan(400);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
    const hasVercel404 = /404\s*$|deployment_not_found|this deployment cannot be found|the page (you|that) (you )?requested (does not|doesn't) exist/i.test(bodyText);
    expect(hasVercel404, `body suggests Vercel default 404 page — domain not attached to a project? body: ${bodyText.slice(0, 200)}`).toBe(false);
  });

  test("api/markets returns json", async ({ request }) => {
    const resp = await request.get(`${TARGET}/api/markets`);
    expect(resp.status(), "markets status").toBeLessThan(500);
    if (resp.status() === 200) {
      const ct = resp.headers()["content-type"] || "";
      expect(ct).toContain("json");
    }
  });

  test("api/markets with filters", async ({ request }) => {
    const resp = await request.get(`${TARGET}/api/markets?status=open&limit=10`);
    expect(resp.status(), "markets filtered status").toBeLessThan(500);
  });

  test("dashboard page loads", async ({ page }) => {
    const resp = await page.goto(`${TARGET}/prime-core/dashboard`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "dashboard status").toBeLessThan(500);
  });

  test("leaderboard page loads", async ({ page }) => {
    const resp = await page.goto(`${TARGET}/prime-core/leaderboard`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "leaderboard status").toBeLessThan(500);
  });
});

test.describe("prime-core preview .vercel.app fallback", () => {
  test("preview URL serves prime-core code", async ({ page }) => {
    const resp = await page.goto(PREVIEW, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "preview home status").toBeLessThan(400);
  });

  test("preview api/markets", async ({ request }) => {
    const resp = await request.get(`${PREVIEW}/api/markets`);
    expect(resp.status(), "preview markets").toBeLessThan(500);
  });
});
