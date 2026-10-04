import { chromium } from "playwright-core"
import { prisma } from "../lib/prisma"
import path from "path"
import fs from "fs"

const ARTIFACTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/8877425f-14b2-4ce1-b4ec-00ba0ed01c01"
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

async function main() {
  console.log("=== CAPTURING M1-M3 VERIFICATION SCREENSHOTS ===")

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  const course = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
    include: { demoSlots: true }
  })
  if (!course) throw new Error("Course not found")
  const slot = course.demoSlots[0]

  // TEST 1: Toggle ON with Active Upcoming Slot
  console.log("\n[Test 1] Toggle ON + Active Slot")
  await prisma.course.update({
    where: { id: course.id },
    data: {
      metadataJson: JSON.stringify({
        demoSettings: {
          enabled: true,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
        },
      }),
    },
  })
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    }
  })

  // 1a. Home Screen Card with Live Demo Badge
  await page.goto("http://localhost:3000/#all-courses-container", { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)
  const homeCardShot = path.join(ARTIFACTS_DIR, "proof_1_home_badge_active.png")
  await page.screenshot({ path: homeCardShot, fullPage: false })
  console.log(`Saved screenshot: ${homeCardShot}`)

  // 1b. Course Page Bundle View with "SCHEDULE FREE DEMO CLASS"
  await page.goto(`http://localhost:3000/courses/${course.slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)
  const bundleViewShot = path.join(ARTIFACTS_DIR, "proof_2_course_bundle_button_active.png")
  await page.screenshot({ path: bundleViewShot, fullPage: false })
  console.log(`Saved screenshot: ${bundleViewShot}`)

  // TEST 2: Toggle OFF Hides Button & Badge Everywhere
  console.log("\n[Test 2] Toggle OFF Hides Button & Badge Everywhere")
  await prisma.course.update({
    where: { id: course.id },
    data: {
      metadataJson: JSON.stringify({
        demoSettings: {
          enabled: false,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
        },
      }),
    },
  })

  // 2a. Course Page with Toggle OFF (Button must be absent)
  await page.goto(`http://localhost:3000/courses/${course.slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)
  const toggleOffCourseShot = path.join(ARTIFACTS_DIR, "proof_3_course_toggle_off.png")
  await page.screenshot({ path: toggleOffCourseShot, fullPage: false })
  console.log(`Saved screenshot: ${toggleOffCourseShot}`)

  // 2b. Home Screen Card with Toggle OFF (Badge must be absent)
  await page.goto("http://localhost:3000/#all-courses-container", { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)
  const toggleOffHomeShot = path.join(ARTIFACTS_DIR, "proof_4_home_badge_toggle_off.png")
  await page.screenshot({ path: toggleOffHomeShot, fullPage: false })
  console.log(`Saved screenshot: ${toggleOffHomeShot}`)

  // TEST 3: Expired Slot Disappears
  console.log("\n[Test 3] Expired Slot Disappears")
  // Re-enable toggle, but make slot expired (3 hours ago)
  await prisma.course.update({
    where: { id: course.id },
    data: {
      metadataJson: JSON.stringify({
        demoSettings: {
          enabled: true,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
        },
      }),
    },
  })
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "SCHEDULED",
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours in the past
    },
  })

  // Verify public demo-slots API returns no active slots
  const res = await fetch(`http://localhost:3000/api/courses/${course.slug}/demo-slots`)
  const slotsApi = await res.json()
  console.log(`Public slots API when expired: hasUpcomingSlots=${slotsApi.hasUpcomingSlots}, count=${slotsApi.slots?.length}`)

  // Home card with expired slot (no demo badge displayed)
  await page.goto("http://localhost:3000/#all-courses-container", { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)
  const expiredHomeShot = path.join(ARTIFACTS_DIR, "proof_5_home_expired_disappeared.png")
  await page.screenshot({ path: expiredHomeShot, fullPage: false })
  console.log(`Saved screenshot: ${expiredHomeShot}`)

  // RESET back to active upcoming slot
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    },
  })
  await prisma.course.update({
    where: { id: course.id },
    data: {
      metadataJson: JSON.stringify({
        demoSettings: {
          enabled: true,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
        },
      }),
    },
  })
  console.log("\nReset course demo settings to ON and slot to Tomorrow.")

  await browser.close()
  console.log("=== SCREENSHOT CAPTURE COMPLETE ===")
}

main()
  .catch((e) => {
    console.error("Screenshot error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
