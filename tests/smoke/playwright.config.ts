import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 2,
  reporter: [["list"], ["github"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    ignoreHTTPSErrors: false,
    userAgent: "art-core-smoke-bot/1.0 (+github-actions)",
  },
});
