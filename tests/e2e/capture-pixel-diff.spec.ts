import { test } from "@playwright/test"
import path from "path"
import fs from "fs"

const OUT_DIR = path.resolve(process.cwd(), "logs/verify-studio/pixel-diff")

test.describe("Step 7: Design Pixel-Diff Verification", () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(OUT_DIR)) {
      fs.mkdirSync(OUT_DIR, { recursive: true })
    }
  })

  const corePages = [
    { name: "books", url: "/books" },
    { name: "courses", url: "/courses" },
    { name: "pricing", url: "/pricing" },
    { name: "login", url: "/login" },
    { name: "forgot-password", url: "/forgot-password" },
    { name: "current-affairs-quizzes", url: "/current-affairs-quizzes" },
    { name: "pyqs", url: "/pyqs" },
    { name: "test-series", url: "/test-series" },
  ]

  for (const pageItem of corePages) {
    test(`Capture pixel-diff baseline: ${pageItem.name}`, async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name === "mobile"
      const prefix = isMobile ? "375px" : "1440px"
      const width = isMobile ? 375 : 1440
      const height = isMobile ? 812 : 900

      await page.setViewportSize({ width, height })

      // Define dynamic locators to mask
      const getMaskLocators = () => [
        page.locator("time"),
        page.locator('[data-testid="avatar"]'),
        page.locator(".timestamp"),
        page.locator('[data-dynamic="true"]'),
      ]

      // 1. Light Mode
      await page.emulateMedia({ colorScheme: "light" })
      await page.goto(pageItem.url, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: path.join(OUT_DIR, `${prefix}_${pageItem.name}_light.png`),
        fullPage: true,
        mask: getMaskLocators(),
      })

      // 2. Dark Mode
      await page.emulateMedia({ colorScheme: "dark" })
      await page.evaluate(() => {
        document.documentElement.classList.add("dark")
      })
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: path.join(OUT_DIR, `${prefix}_${pageItem.name}_dark.png`),
        fullPage: true,
        mask: getMaskLocators(),
      })
    })
  }
})
