import { chromium } from "playwright"
import fs from "fs"
import path from "path"

async function main() {
  const outDir = path.join(process.cwd(), "docs/evidence/course-detail-v2")
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

  console.log("Navigating to BPSC Demolish Desktop (1280px)...")
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${BASE_URL}/courses/bpsc-mains-demolish`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(outDir, "bpsc-desktop-1280.png"), fullPage: false })

  console.log("Capturing BPSC Ultra-wide Desktop (1920px)...")
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, "bpsc-desktop-1920.png"), fullPage: false })

  console.log("Capturing BPSC Tablet (768px)...")
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, "bpsc-tablet-768.png"), fullPage: false })

  console.log("Capturing BPSC Mobile (360px)...")
  await page.setViewportSize({ width: 360, height: 780 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, "bpsc-mobile-360.png"), fullPage: false })

  console.log("Capturing Hindi Mode Desktop...")
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.click("button:has-text('हिन्दी')")
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, "bpsc-hindi-desktop.png"), fullPage: false })

  console.log("Capturing Hindi Mode Mobile (360px)...")
  await page.setViewportSize({ width: 360, height: 780 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, "bpsc-hindi-mobile.png"), fullPage: false })

  console.log("Capturing SSC CGL Masterclass Desktop...")
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${BASE_URL}/courses/ssc-cgl-tier-2-masterclass`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(outDir, "ssc-desktop-1280.png"), fullPage: false })

  console.log("Capturing SSC CGL Masterclass Mobile (360px)...")
  await page.setViewportSize({ width: 360, height: 780 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, "ssc-mobile-360.png"), fullPage: false })

  await browser.close()
  console.log("All evidence screenshots captured successfully in", outDir)
}

main().catch((err) => {
  console.error("Error capturing evidence:", err)
  process.exit(1)
})
