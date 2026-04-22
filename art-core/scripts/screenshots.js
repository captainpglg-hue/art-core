#!/usr/bin/env node
/**
 * ART-CORE — Screenshot capture script
 * Visits each page of the 3 apps and saves PNG screenshots.
 * Usage: node scripts/screenshots.js
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

// ── Config ────────────────────────────────────────────────────
const BASE_URL = "http://localhost:3003"; // already running dev server
const OUT_DIR = path.join(__dirname, "../public/screenshots");
const VIEWPORT = { width: 1440, height: 900 };
const WAIT_MS = 3000; // wait for animations/fonts

const PAGES = [
  // Hub
  { url: "/",                       name: "hub" },

  // ART-CORE
  { url: "/art-core",               name: "art-core--marketplace" },
  { url: "/art-core/search",        name: "art-core--search" },
  { url: "/art-core/deposer",       name: "art-core--deposer" },
  { url: "/art-core/trending",      name: "art-core--trending" },
  { url: "/art-core/favoris",       name: "art-core--favoris" },
  { url: "/art-core/orders",        name: "art-core--orders" },
  { url: "/art-core/collection",    name: "art-core--collection" },
  { url: "/art-core/dashboard",     name: "art-core--dashboard" },
  { url: "/art-core/notifications", name: "art-core--notifications" },
  { url: "/art-core/carte",         name: "art-core--carte" },
  { url: "/art-core/identifier",    name: "art-core--identifier" },

  // PASS-CORE
  { url: "/pass-core/certifier",    name: "pass-core--certifier" },
  { url: "/pass-core/verifier",     name: "pass-core--verifier" },
  { url: "/pass-core/gallery",      name: "pass-core--gallery" },
  { url: "/pass-core/proprietaire", name: "pass-core--proprietaire" },
  { url: "/pass-core/abonnement",   name: "pass-core--abonnement" },

  // PRIME-CORE
  { url: "/prime-core/dashboard",   name: "prime-core--dashboard" },
  { url: "/prime-core/leaderboard", name: "prime-core--leaderboard" },
  { url: "/prime-core/wallet",      name: "prime-core--wallet" },
  { url: "/prime-core/paris",       name: "prime-core--paris" },
  { url: "/prime-core/artistes",    name: "prime-core--artistes" },
  { url: "/prime-core/niveaux",     name: "prime-core--niveaux" },
  { url: "/prime-core/abonnement",  name: "prime-core--abonnement" },

  // AUTH
  { url: "/auth/login",             name: "auth--login" },
  { url: "/auth/signup",            name: "auth--signup" },
  { url: "/auth/forgot-password",   name: "auth--forgot-password" },
  { url: "/auth/onboarding",        name: "auth--onboarding" },
];

// ── Helpers ───────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkServer(url, retries = 20) {
  const http = require("http");
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => resolve(res));
        req.on("error", reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error("timeout")); });
      });
      return true;
    } catch {
      process.stdout.write(".");
      await sleep(1000);
    }
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("\n🎨 ART-CORE Screenshot Tool\n");
  console.log(`Output dir : ${OUT_DIR}`);
  console.log(`Base URL   : ${BASE_URL}`);
  console.log(`Pages      : ${PAGES.length}\n`);

  // 1. Check if dev server is already running
  console.log("⏳ Checking dev server...");
  let serverProcess = null;
  const serverRunning = await checkServer(BASE_URL + "/", 3);

  if (!serverRunning) {
    // Try alternate ports
    for (const port of [3000, 3001, 3002, 3003, 3004]) {
      const alt = `http://localhost:${port}`;
      const ok = await checkServer(alt, 2);
      if (ok) {
        console.log(`\n✅ Found running dev server on port ${port}`);
        // Patch BASE_URL dynamically
        PAGES.forEach(p => p._base = alt);
        break;
      }
    }
  } else {
    console.log(`\n✅ Dev server already running at ${BASE_URL}`);
  }

  // 2. Launch Puppeteer
  console.log("\n🚀 Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1440,900",
    ],
  });

  const results = [];

  // 3. Screenshot each page
  for (const pageConfig of PAGES) {
    const base = pageConfig._base || BASE_URL;
    const fullUrl = base + pageConfig.url;
    const filename = `${pageConfig.name}.png`;
    const outPath = path.join(OUT_DIR, filename);

    process.stdout.write(`📸 ${pageConfig.url.padEnd(35)}`);

    const page = await browser.newPage();
    try {
      await page.setViewport(VIEWPORT);

      // Set dark theme preference
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: "dark" },
      ]);

      // Block heavy external resources to speed up
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const type = req.resourceType();
        if (["font"].includes(type)) {
          req.continue();
        } else if (type === "media") {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(fullUrl, {
        waitUntil: "networkidle2",
        timeout: 15000,
      });

      // Wait for fonts + animations
      await sleep(WAIT_MS);

      // Scroll to trigger lazy-loaded images
      await page.evaluate(() => {
        window.scrollTo(0, 300);
      });
      await sleep(500);
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await sleep(300);

      await page.screenshot({
        path: outPath,
        fullPage: false, // viewport only — keeps consistent size
        type: "png",
      });

      const size = Math.round(fs.statSync(outPath).size / 1024);
      console.log(`✅  ${filename} (${size} KB)`);
      results.push({ url: pageConfig.url, file: filename, path: outPath, size, status: "ok" });

    } catch (err) {
      console.log(`❌  FAILED — ${err.message.slice(0, 60)}`);
      results.push({ url: pageConfig.url, file: filename, status: "error", error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // 4. Summary
  const ok = results.filter((r) => r.status === "ok");
  const failed = results.filter((r) => r.status === "error");

  console.log("\n─────────────────────────────────────────");
  console.log(`✅ Success : ${ok.length}/${PAGES.length}`);
  if (failed.length > 0) {
    console.log(`❌ Failed  : ${failed.length}`);
    failed.forEach((r) => console.log(`   • ${r.url} — ${r.error?.slice(0, 80)}`));
  }

  console.log("\n📁 Files created:");
  ok.forEach((r) => {
    console.log(`   ${r.path}`);
  });

  // 5. Write manifest JSON
  const manifest = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    total: results.length,
    success: ok.length,
    failed: failed.length,
    pages: results,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "_manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\n📋 Manifest: ${path.join(OUT_DIR, "_manifest.json")}`);
  console.log(`\n🎉 Done. Screenshots saved to:\n   ${OUT_DIR}\n`);
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
