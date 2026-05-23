import { test, expect } from "@playwright/test";

const BASE = "https://art-core.app";

test.describe("art-core.app", () => {
  test("home renders", async ({ page }) => {
    const resp = await page.goto(BASE, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), `home status`).toBeLessThan(400);
    await expect(page).toHaveTitle(/art|core/i);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length, "body should have content").toBeGreaterThan(50);
  });

  test("api/health returns 200 json", async ({ request }) => {
    const resp = await request.get(`${BASE}/api/health`);
    expect(resp.status(), "health status").toBe(200);
    const ct = resp.headers()["content-type"] || "";
    expect(ct, "content-type").toContain("json");
  });

  test("boutique page loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/art-core/boutique`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "boutique status").toBeLessThan(500);
  });

  test("search page loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/art-core/search`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "search status").toBeLessThan(500);
  });

  test("login page loads with form", async ({ page }) => {
    const resp = await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "login status").toBeLessThan(500);
    await expect(page.locator("input").first()).toBeVisible();
  });

  test("deposer page loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/art-core/deposer`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "deposer status").toBeLessThan(500);
  });

  test("no React error overlay on home", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await page.goto(BASE, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const fatal = consoleErrors.filter((e) =>
      /chunkloaderror|hydration|cannot read|undefined is not/i.test(e)
    );
    expect(fatal, `fatal console errors: ${fatal.join(" | ")}`).toHaveLength(0);
  });
});
