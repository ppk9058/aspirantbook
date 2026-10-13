import { test } from "@playwright/test"
import path from "path"

test.describe("Color Verification Screenshots", () => {
  const screenshotDir = path.resolve(process.cwd(), "logs/verify-studio/colors")

  test("Capture pages before/after color migration", async ({ page }) => {
    const pages = [
      { url: "/dashboard", name: "dashboard" },
      { url: "/books", name: "books" },
      { url: "/pyqs", name: "pyq" },
      { url: "/current-affairs-quizzes", name: "current-affairs-quizzes" },
      { url: "/checkout?plan=monthly", name: "razorpay-checkout" },
      { url: "/admin", name: "admin" },
    ]

    for (const p of pages) {
      try {
        await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 45_000 })
        await page.waitForTimeout(1000)
        await page.screenshot({ path: path.join(screenshotDir, `after_${p.name}.png`), fullPage: false })
        await page.screenshot({ path: path.join(screenshotDir, `${p.name}.png`), fullPage: false })
      } catch (err) {
        console.warn(`Could not screenshot ${p.url}:`, err)
      }
    }
  })
})
