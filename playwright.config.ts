import { defineConfig, devices } from "@playwright/test";
import { assertTestDatabase } from "./lib/test-db-guard";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045";

// Every Playwright run is a test run: pin it to the Docker test database.
// There is deliberately no bypass — a run pointed at any other database aborts
// here, before a browser or the webServer starts.
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes("trillionskill_test")) {
  process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
  process.env.DIRECT_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
}
process.env.APP_ENV = "test";
assertTestDatabase({ context: "playwright.config.ts" });



export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./logs/verify-studio/e2e/playwright-results",
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command:
      "PORT=3045 NEXT_DIST_DIR=.next-test DATABASE_URL=postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test DIRECT_URL=postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test NEXTAUTH_URL=http://127.0.0.1:3045 AUTH_URL=http://127.0.0.1:3045 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3045 APP_ENV=test ALLOW_DEV_MOBILE_LOGIN=false npx next dev --hostname 127.0.0.1 --port 3045",
    url: "http://127.0.0.1:3045/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "on",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: ["**/canary-journey.spec.ts", "**/real-only-series-catalogue.spec.ts"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      testIgnore: ["**/canary-journey.spec.ts", "**/real-only-series-catalogue.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "canary",
      testMatch: "**/canary-journey.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "real-catalogue-desktop",
      testMatch: "**/real-only-series-catalogue.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "real-catalogue-mobile",
      testMatch: "**/real-only-series-catalogue.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
