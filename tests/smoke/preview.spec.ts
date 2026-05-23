import { test, expect } from "@playwright/test";

const PASS_CORE_PREVIEW = process.env.PASS_CORE_PREVIEW
  ?? "https://pass-core-final-git-claude-kee-aca34a-captainpglg-hues-projects.vercel.app";
const PRIME_CORE_PREVIEW = process.env.PRIME_CORE_PREVIEW
  ?? "https://fresh-core-app-git-claude-keen-0129e3-captainpglg-hues-projects.vercel.app";

test.describe("preview (branch claude/keen-wozniak-6C1Tk)", () => {
  test("pass-core preview gallery returns < 500 (fix verification)", async ({ request }) => {
    const resp = await request.get(`${PASS_CORE_PREVIEW}/pass-core/gallery`);
    expect(resp.status(), `gallery preview status (was 500 in prod before fix)`).toBeLessThan(500);
  });

  test("prime-core preview api/markets returns < 500 (fix verification)", async ({ request }) => {
    const resp = await request.get(`${PRIME_CORE_PREVIEW}/api/markets`);
    expect(resp.status(), `markets preview status (was 500 in prod before fix)`).toBeLessThan(500);
  });

  test("prime-core preview api/markets returns json body", async ({ request }) => {
    const resp = await request.get(`${PRIME_CORE_PREVIEW}/api/markets`);
    if (resp.status() < 500) {
      const ct = resp.headers()["content-type"] || "";
      expect(ct).toContain("json");
      const body = await resp.json();
      expect(body, "body should have markets key").toHaveProperty("markets");
    }
  });
});
