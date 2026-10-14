import { chromium } from "playwright-core"
import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"
import path from "path"
import { DEFAULT_TEST_PASSWORD } from "../tests/support/test-credentials"

const ARTIFACTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/8877425f-14b2-4ce1-b4ec-00ba0ed01c01"

async function main() {
  console.log("=== GENERATING ALL PROOFS FOR USER ===")

  const course = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" }
  })
  if (!course) throw new Error("Course not found")

  // Ensure slot exists
  let slot = await prisma.demoSlot.findFirst({
    where: { courseId: course.id }
  })
  if (!slot) {
    slot = await prisma.demoSlot.create({
      data: {
        courseId: course.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        durationMinutes: 60,
        topic: "72nd BPSC Prelims Strategy & Trend Analysis",
        facultyName: "Prof. Rajesh Sharma",
        agoraChannelName: `demo_slot_${course.id.slice(-8)}_${Date.now()}`,
        status: "SCHEDULED",
        maxAudience: 100,
      }
    })
  }

  // Setup admin user password for browser login
  const testPassword = DEFAULT_TEST_PASSWORD
  const hashedPassword = await bcrypt.hash(testPassword, 10)
  await prisma.user.upsert({
    where: { email: "admin@trillionskills.com" },
    update: { password: hashedPassword, role: "ADMIN" },
    create: {
      email: "admin@trillionskills.com",
      name: "Admin User",
      role: "ADMIN",
      password: hashedPassword,
    }
  })

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  async function revalidate() {
    try {
      await fetch("http://localhost:3000/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `/courses/${course?.slug}`, tag: "courses" })
      })
      await fetch("http://localhost:3000/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/" })
      })
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // PROOF 1: Toggle ON + Active Slot (Course Button & Home Badge)
  // -------------------------------------------------------------
  console.log("\n[1] Setting Toggle ON + Active Slot (Tomorrow 6:00 PM)")
  await prisma.course.update({
    where: { id: course.id },
    data: {
      metadataJson: JSON.stringify({
        demoSettings: {
          enabled: true,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
        }
      })
    }
  })
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    }
  })
  await revalidate()

  // 1a. Course page with Button
  await page.goto(`http://localhost:3000/courses/${course.slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)
  const p1Course = path.join(ARTIFACTS_DIR, "proof_1_course_button_visible.png")
  await page.screenshot({ path: p1Course })
  console.log(`Saved: ${p1Course}`)

  // 1b. Home page scrolled to BPSC with Badge
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" })
  await page.evaluate(() => {
    const el = document.querySelector("#all-courses-container") || document.body
    window.scrollTo(0, 1150)
  })
  await page.waitForTimeout(1500)
  const p1Home = path.join(ARTIFACTS_DIR, "proof_1_home_badge_visible.png")
  await page.screenshot({ path: p1Home })
  console.log(`Saved: ${p1Home}`)

  // -------------------------------------------------------------
  // PROOF 2: Toggle OFF (Button & Badge Hidden)
  // -------------------------------------------------------------
  console.log("\n[2] Setting Toggle OFF")
  await prisma.course.update({
    where: { id: course.id },
    data: {
      metadataJson: JSON.stringify({
        demoSettings: {
          enabled: false,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
        }
      })
    }
  })
  await revalidate()

  // 2a. Course page without Button
  await page.goto(`http://localhost:3000/courses/${course.slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)
  const p2Course = path.join(ARTIFACTS_DIR, "proof_2_course_button_hidden.png")
  await page.screenshot({ path: p2Course })
  console.log(`Saved: ${p2Course}`)

  // 2b. Home page without Badge
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" })
  await page.evaluate(() => {
    window.scrollTo(0, 1150)
  })
  await page.waitForTimeout(1500)
  const p2Home = path.join(ARTIFACTS_DIR, "proof_2_home_badge_hidden.png")
  await page.screenshot({ path: p2Home })
  console.log(`Saved: ${p2Home}`)

  // -------------------------------------------------------------
  // PROOF 3: Expired Slot Disappears
  // -------------------------------------------------------------
  console.log("\n[3] Setting Slot Expired (3 hours ago)")
  await prisma.course.update({
    where: { id: course.id },
    data: {
      metadataJson: JSON.stringify({
        demoSettings: {
          enabled: true,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
        }
      })
    }
  })
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "SCHEDULED",
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    }
  })
  await revalidate()

  const slotsRes = await fetch(`http://localhost:3000/api/courses/${course.slug}/demo-slots`)
  const slotsData = await slotsRes.json()
  console.log("Public slots when expired (should have 0 slots):", slotsData.slots?.length)

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" })
  await page.evaluate(() => {
    window.scrollTo(0, 1150)
  })
  await page.waitForTimeout(1500)
  const p3Expired = path.join(ARTIFACTS_DIR, "proof_3_home_expired_disappeared.png")
  await page.screenshot({ path: p3Expired })
  console.log(`Saved: ${p3Expired}`)

  // Reset slot to tomorrow & enabled: true
  await prisma.course.update({
    where: { id: course.id },
    data: {
      metadataJson: JSON.stringify({
        demoSettings: {
          enabled: true,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
        }
      })
    }
  })
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  })
  await revalidate()

  // -------------------------------------------------------------
  // PROOF 4: Admin Studio with Real Minutes Counter
  // -------------------------------------------------------------
  console.log("\n[4] Logging into Admin & Capturing Live Demo Studio")
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" })
  await page.fill('#email', "admin@trillionskills.com")
  await page.fill('#password', testPassword)
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
    page.locator('button:has-text("Sign In")').click(),
  ])
  await page.waitForTimeout(2000)

  // Navigate to course edit
  await page.goto(`http://localhost:3000/admin/courses/${course.id}/edit`, { waitUntil: "networkidle" })
  await page.waitForTimeout(2500)

  // Scroll to Demo Studio card
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h3, h2, span, div"))
    const card = headings.find(el => el.textContent?.includes("LIVE DEMO & SLOT SCHEDULING STUDIO"))
    if (card) {
      card.scrollIntoView({ behavior: "instant", block: "start" })
    }
  })
  await page.waitForTimeout(1500)

  const p4Admin = path.join(ARTIFACTS_DIR, "proof_4_admin_studio_counter.png")
  await page.screenshot({ path: p4Admin })
  console.log(`Saved: ${p4Admin}`)

  await browser.close()
  console.log("\n=== ALL PROOFS CAPTURED SUCCESSFULLY ===")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
