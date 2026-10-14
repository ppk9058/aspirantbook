import { chromium } from "playwright-core"
import { prisma } from "../lib/prisma"
import path from "path"
import { DEFAULT_TEST_PASSWORD } from "../tests/support/test-credentials"

const ARTIFACTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/8877425f-14b2-4ce1-b4ec-00ba0ed01c01"

async function main() {
  const course = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" }
  })
  if (!course) throw new Error("Course not found")

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // 1. Home page scrolled to BPSC card
  console.log("Capturing Home page with Live Demo badge...")
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" })
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll("h3, div, p, span")).find(el => el.textContent?.includes("72nd BPSC — Prelims Current Affairs"))
    if (card) card.scrollIntoView({ block: "center" })
    else window.scrollTo(0, 1600)
  })
  await page.waitForTimeout(1500)
  const homeBadgeShot = path.join(ARTIFACTS_DIR, "proof_1_home_badge_focused.png")

  await page.screenshot({ path: homeBadgeShot })
  console.log(`Saved: ${homeBadgeShot}`)

  // 2. Admin Studio focused on Live Demo Card
  console.log("Logging into Admin to capture Live Demo card...")
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" })
  await page.fill('#email', "admin@trillionskills.com")
  await page.fill('#password', DEFAULT_TEST_PASSWORD)
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
    page.locator('button:has-text("Sign In")').click(),
  ])
  await page.waitForTimeout(2000)

  await page.goto(`http://localhost:3000/admin/courses/${course.id}/edit`, { waitUntil: "networkidle" })
  await page.waitForTimeout(2500)

  // Scroll to Demo Studio card
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h3, h2, span, div, p"))
    const card = headings.find(el => el.textContent?.includes("LIVE DEMO & SLOT SCHEDULING STUDIO"))
    if (card) {
      card.scrollIntoView({ block: "start" })
    }
  })
  await page.waitForTimeout(1500)
  const adminStudioShot = path.join(ARTIFACTS_DIR, "proof_4_admin_studio_focused.png")
  await page.screenshot({ path: adminStudioShot })
  console.log(`Saved: ${adminStudioShot}`)

  await browser.close()
}

main().catch(console.error).finally(() => prisma.$disconnect())
