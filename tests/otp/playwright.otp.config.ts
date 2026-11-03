import path from "path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated Playwright config for the OTP work.
 *
 * The repo-wide config pins port 3045 and the shared `trillionskill_test`
 * database. The OTP task is restricted to port 3047 and the dedicated
 * `otp_test` database, so this config starts its own server with those values.
 */

const PORT = 3047;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/otp_test";

export default defineConfig({
  testDir: "../e2e",
  testMatch: "otp-mobile-login.spec.ts",
  outputDir: "./logs/playwright-results",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    cwd: path.resolve(__dirname, "../.."),
    command:
      `PORT=${PORT} NEXT_DIST_DIR=.next-test ` +
      `DATABASE_URL=${DB_URL} DIRECT_URL=${DB_URL} ` +
      `APP_ENV=test ALLOW_DEV_MOBILE_LOGIN=false ` +
      `AUTH_SECRET=otp_playwright_secret NEXTAUTH_SECRET=otp_playwright_secret ` +
      `NEXTAUTH_URL=${BASE_URL} AUTH_URL=${BASE_URL} NEXT_PUBLIC_APP_URL=${BASE_URL} ` +
      `npx next dev --hostname 127.0.0.1 --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
