const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:3005";
const OUT_DIR = path.join(__dirname, "../public/screenshots");

const PAGES = [
  { name: "01-hub", url: "/" },
  { name: "02-art-core-marketplace", url: "/art-core" },
  { name: "03-art-core-deposer", url: "/art-core/deposer" },
  { name: "04-art-core-checkout", url: "/art-core/checkout" },
  { name: "05-pass-core-certifier", url: "/pass-core/certifier" },
  { name: "06-pass-core-verifier", url: "/pass-core/verifier" },
  { name: "07-pass-core-gallery", url: "/pass-core/gallery" },
  { name: "08-auth-login", url: "/auth/login" },
  { name: "09-auth-signup", url: "/auth/signup" },
  { name: "10-auth-onboarding", url: "/auth/onboarding" },
  { name: "11-prime-core-dashboard", url: "/prime-core/dashboard" },
  { name: "12-prime-core-leaderboard", url: "/prime-core/leaderboard" },
  { name: "13-prime-core-wallet", url: "/prime-core/wallet" },
  { name: "14-art-core-search", url: "/art-core/search" },
  { name: "15-art-core-trending", url: "/art-core/trending" },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = [];

  for (const p of PAGES) {
    try {
      console.log(`Screenshot: ${p.name} — ${p.url}`);
      const fullUrl = `${BASE_URL}${p.url}`;
      await page.goto(fullUrl, { waitUntil: "networkidle0", timeout: 15000 });

      // Wait a bit for dynamic content
      await new Promise((r) => setTimeout(r, 1500));

      const outPath = path.join(OUT_DIR, `${p.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });

      const title = await page.title().catch(() => "—");
      results.push({ page: p.name, url: p.url, status: "OK", title });
      console.log(`  ✓ ${title}`);
    } catch (err) {
      results.push({ page: p.name, url: p.url, status: "ERROR", error: err.message });
      console.error(`  ✗ ${err.message}`);
    }
  }

  await browser.close();

  console.log("\n=== SCREENSHOT REPORT ===");
  results.forEach((r) => {
    const icon = r.status === "OK" ? "✓" : "✗";
    console.log(`${icon} ${r.page}: ${r.status}${r.error ? " — " + r.error : " — " + r.title}`);
  });

  // Save report
  fs.writeFileSync(
    path.join(OUT_DIR, "report.json"),
    JSON.stringify(results, null, 2)
  );
  console.log("\nScreenshots saved to /public/screenshots/");
}

main().catch(console.error);
