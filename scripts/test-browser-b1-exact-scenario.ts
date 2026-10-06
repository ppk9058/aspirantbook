import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  // Test both with baseURL localhost and 127.0.0.1
  for (const host of ["localhost", "127.0.0.1"]) {
    console.log(`\n==============================================`);
    console.log(`TESTING HOST: http://${host}:3055`);
    console.log(`==============================================`);
    const context = await browser.newContext({
      baseURL: `http://${host}:3055`
    });
    const page = await context.newPage();

    console.log("1. Navigating to login page...");
    await page.goto("/login");

    console.log("2. Opening mobile auth modal...");
    const continueBtn = page.locator('button:has-text("Continue with Mobile OTP")');
    await continueBtn.click();
    await page.waitForTimeout(500);

    console.log("3. Filling 10-digit phone number in modal...");
    const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
    await phoneInput.fill("9999999999");
    
    console.log("4. Clicking Get OTP...");
    const getOtpBtn = page.locator('button:has-text("Get OTP")');
    await getOtpBtn.click();
    await page.waitForTimeout(1000);

    console.log("5. Pasting OTP into first box...");
    const firstOtpBox = page.locator('div.fixed.z-\\[9999\\] input[inputmode="numeric"]').first();
    await firstOtpBox.focus();
    await page.evaluate(() => {
      const input = document.querySelector('div.fixed.z-\\[9999\\] input[inputmode="numeric"]') as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        dt.setData('text/plain', '123456');
        const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true });
        input.dispatchEvent(event);
      }
    });

    console.log("Waiting for verification...");
    await page.waitForTimeout(3000);

    console.log("Current URL after login:", page.url());
    const cookies = await context.cookies();
    console.log("Cookies after login:", cookies.map(c => `${c.name} (${c.domain})`));

    console.log("6. Clicking LeftSidebar / TopNavBar Dashboard link...");
    const dashboardLink = page.locator('a[href="/dashboard"]').first();
    if (await dashboardLink.isVisible()) {
      console.log("Clicking visible a[href='/dashboard']...");
      await dashboardLink.click();
    } else {
      console.log("Navigating to /dashboard via page.goto...");
      await page.goto("/dashboard");
    }
    await page.waitForTimeout(2000);

    console.log("Final URL:", page.url());
    console.log("Is Login button visible?", await page.locator('button:has-text("Login / Register")').isVisible());
    console.log("Is User menu visible?", await page.locator('button[aria-label="User menu"]').isVisible());

    await context.close();
  }
  await browser.close();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
