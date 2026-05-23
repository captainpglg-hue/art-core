import { test, expect } from "@playwright/test";

const BASE = "https://pass-core.app";

test.describe("pass-core.app", () => {
  test("home renders", async ({ page }) => {
    const resp = await page.goto(BASE, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "home status").toBeLessThan(400);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("certifier page loads with form", async ({ page }) => {
    const resp = await page.goto(`${BASE}/pass-core/certifier`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "certifier status").toBeLessThan(500);
    await expect(page.locator("input, textarea").first()).toBeVisible();
  });

  test("gallery page loads without 500", async ({ page }) => {
    const resp = await page.goto(`${BASE}/pass-core/gallery`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "gallery status").toBeLessThan(500);
  });

  test("verifier page loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/pass-core/verifier`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "verifier status").toBeLessThan(500);
  });

  test("api/blockchain/status returns json", async ({ request }) => {
    const resp = await request.get(`${BASE}/api/blockchain/status`);
    expect(resp.status(), "blockchain/status").toBeLessThan(500);
  });

  test("no fatal console errors on home", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(BASE, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const fatal = errs.filter((e) =>
      /chunkloaderror|hydration|cannot read|undefined is not/i.test(e)
    );
    expect(fatal, `fatal: ${fatal.join(" | ")}`).toHaveLength(0);
  });
});
