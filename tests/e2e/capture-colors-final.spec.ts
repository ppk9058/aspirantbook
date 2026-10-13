import { test, expect } from "@playwright/test"
import path from "path"

const OUT_DIR = path.resolve(process.cwd(), "logs/verify-studio/colors-final")

test.describe("Colour & Accessibility Pass (Light & Dark Mode Proofs)", () => {
  const pagesToCapture = [
    { name: "books", url: "/books" },
    { name: "pricing", url: "/pricing" },
    { name: "courses", url: "/courses" },
    { name: "test-series", url: "/test-series" },
  ]

  for (const pageItem of pagesToCapture) {
    test(`Capture ${pageItem.name} in Light and Dark mode`, async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name === "mobile"
      const prefix = isMobile ? "mobile" : "desktop"

      // 1. Light Mode
      await page.emulateMedia({ colorScheme: "light" })
      await page.goto(pageItem.url, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(1000)
      await page.screenshot({
        path: path.join(OUT_DIR, `${prefix}_${pageItem.name}_light.png`),
        fullPage: false,
      })

      // 2. Dark Mode
      await page.emulateMedia({ colorScheme: "dark" })
      await page.evaluate(() => {
        document.documentElement.classList.add("dark")
      })
      await page.waitForTimeout(1000)
      await page.screenshot({
        path: path.join(OUT_DIR, `${prefix}_${pageItem.name}_dark.png`),
        fullPage: false,
      })
    })
  }
})
