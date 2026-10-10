import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3045";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./logs/verify-studio/e2e/playwright-results",
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
