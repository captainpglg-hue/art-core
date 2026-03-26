import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "https://art-core-brown.vercel.app",
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "android-chrome",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
      },
    },
  ],
});
