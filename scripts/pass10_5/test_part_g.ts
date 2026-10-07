import { chromium } from "playwright";
import { execSync } from "child_process";

const BASE_URL = "http://127.0.0.1:3045";

async function main() {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const timestamp = new Date().toISOString();

  console.log("================================================================================");
  console.log("PART G: callbackUrl FINAL LANDING URL AFTER PLAYWRIGHT OTP LOGIN");
  console.log(`Commit: ${commit}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("Database: postgresql://***@127.0.0.1:54329/trillionskill_test");
  console.log("================================================================================");

  const attackInputs = [
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "/%5Cevil.com",
    "javascript:alert(1)",
    "%2F%2Fevil.com",
    "data:text/html,x",
    "http://127.0.0.1:9999/x",
    "//attacker.com/steal",
    "/courses/72nd-bpsc-prelims-current-affairs", // Valid control case
  ];

  const browser = await chromium.launch({ headless: true });

  let safeCount = 0;
  let totalCount = attackInputs.length;

  for (const input of attackInputs) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const targetLoginUrl = `${BASE_URL}/login?callbackUrl=${encodeURIComponent(input)}`;
    await page.goto(targetLoginUrl, { waitUntil: "domcontentloaded" });

    // 1. Open mobile auth modal
    const continueBtn = page.locator('button:has-text("Continue with Mobile OTP")');
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      await page.waitForTimeout(500);

      // 2. Fill mobile number
      const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
      await phoneInput.fill("9999999999");

      // 3. Click Get OTP
      const getOtpBtn = page.locator('button:has-text("Get OTP")');
      await getOtpBtn.click();
      await page.waitForTimeout(800);

      // 4. Paste OTP
      const firstOtpBox = page.locator('div.fixed.z-\\[9999\\] input[inputmode="numeric"]').first();
      await firstOtpBox.focus();
      await page.evaluate(() => {
        const inp = document.querySelector('div.fixed.z-\\[9999\\] input[inputmode="numeric"]') as HTMLInputElement;
        if (inp) {
          const dt = new DataTransfer();
          dt.setData("text/plain", "123456");
          const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true });
          inp.dispatchEvent(ev);
        }
      });

      // 5. Wait for verification and redirect
      await page.waitForTimeout(2500);
    }

    const finalUrl = page.url();
    const isExternal = finalUrl.includes("evil.com") || finalUrl.includes("attacker.com") || finalUrl.includes("data:") || finalUrl.includes("9999");
    const isSafe = !isExternal;
    if (isSafe) safeCount++;

    console.log(`[CALLBACK TEST] Input: "${input.padEnd(42)}" -> Landed at: ${finalUrl} => ${isSafe ? "PASS (SAFE)" : "FAIL"}`);
    await context.close();
  }

  await browser.close();

  console.log(`\nCALLBACK INPUTS SAFE: ${safeCount} / ${totalCount}`);
  console.log("\n================================================================================");
  console.log("PART G VERIFICATION COMPLETE");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Error in Part G:", err);
  process.exit(1);
});
