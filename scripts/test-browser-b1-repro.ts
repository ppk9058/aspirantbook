import { chromium } from "playwright";
import { encode } from "next-auth/jwt";

const PRE10_PORT = 3055;
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function run() {
  const token = await encode({
    token: { id: "u_student_free_p9", role: "FREE", email: "student_free@p9.local", name: "Free Student" },
    secret: SECRET,
    salt: "authjs.session-token",
  });

  const browser = await chromium.launch({ headless: true });

  for (const host of ["127.0.0.1", "localhost"]) {
    console.log(`\nTesting browser on http://${host}:${PRE10_PORT}/dashboard`);
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "authjs.session-token",
        value: token,
        domain: host,
        path: "/",
        httpOnly: true,
        sameSite: "Lax"
      }
    ]);

    const page = await context.newPage();
    const response = await page.goto(`http://${host}:${PRE10_PORT}/dashboard`, { waitUntil: "networkidle" });
    console.log(`Final URL: ${page.url()}`);
    console.log(`HTTP Status: ${response?.status()}`);

    // Check if redirected to "/"
    const isLanding = page.url() === `http://${host}:${PRE10_PORT}/` || page.url() === `http://${host}:${PRE10_PORT}`;
    console.log(`Redirected to landing page (/): ${isLanding ? "YES (B1 REPRODUCED)" : "NO"}`);

    // Also click "Dashboard" link in menu
    const dashLink = page.locator('a[href="/dashboard"]').first();
    if (await dashLink.count() > 0) {
      console.log('Clicking "Dashboard" link in UI...');
      await dashLink.click();
      await page.waitForTimeout(2000);
      console.log(`URL after clicking Dashboard: ${page.url()}`);
    }

    await context.close();
  }

  await browser.close();
}

run().catch(console.error);
