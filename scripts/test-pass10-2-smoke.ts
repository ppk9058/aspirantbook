import { chromium } from "playwright";
import * as fs from "fs";

async function run() {
  console.log("=== PASS 10.2 PLAYWRIGHT SMOKE TEST (PORT 3045 & PORT 3000) ===");
  fs.mkdirSync("artifacts/pass10_2", { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const targets = [
    { name: "Fresh Test Server (3045)", url: "http://127.0.0.1:3045/" },
    { name: "Dev Server (3000)", url: "http://localhost:3000/" }
  ];

  const viewports = [
    { width: 1280, height: 800, label: "desktop" },
    { width: 390, height: 844, label: "mobile" }
  ];

  for (const target of targets) {
    console.log(`\nTesting target: ${target.name} -> ${target.url}`);
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height }
      });
      const page = await context.newPage();

      try {
        const response = await page.goto(target.url, { waitUntil: "networkidle", timeout: 15000 });
        const status = response ? response.status() : 0;
        console.log(`[${vp.label}] HTTP Status: ${status}`);

        // Check for 404 text
        const bodyText = await page.locator("body").innerText();
        const has404 = bodyText.includes("404 • Page Not Found") || bodyText.includes("Looking for something?");
        console.log(`[${vp.label}] Has 404 text: ${has404 ? "YES (FAIL)" : "NO (PASS)"}`);

        // Computed style check
        const bodyFont = await page.evaluate(() => {
          return window.getComputedStyle(document.body).fontFamily;
        });
        console.log(`[${vp.label}] Computed body font-family: ${bodyFont}`);

        // Take screenshot
        const shotPath = `artifacts/pass10_2/${target.name.includes("3045") ? "test_3045" : "dev_3000"}_${vp.label}.png`;
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`[${vp.label}] Saved screenshot: ${shotPath}`);

        if (status !== 200 || has404) {
          throw new Error(`Smoke test failed for ${target.name} on ${vp.label}: status=${status}, has404=${has404}`);
        }
      } catch (err: any) {
        console.error(`[${vp.label}] Error:`, err.message);
        throw err;
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  console.log("\nALL SMOKE TESTS PASSED!");
}

run().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
