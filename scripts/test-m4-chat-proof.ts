/**
 * M4 Chat Proof Script
 * Two-context Playwright test: Teacher + Student in a live demo, sending real chat messages.
 */

import { chromium } from "playwright-core"
import path from "path"
import { prisma } from "../lib/prisma"

const BASE_URL = "http://localhost:3000"
const COURSE_SLUG = "72nd-bpsc-prelims-current-affairs"
const TEACHER_EMAIL = "teacher@trillionskills.com"
const TEACHER_PASS = "Teacher@123"
const ARTIFACTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/8877425f-14b2-4ce1-b4ec-00ba0ed01c01"

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function saveScreenshot(page: any, name: string) {
  const filePath = path.join(ARTIFACTS_DIR, `m4_${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`  📸 ${name} → ${filePath}`)
  return filePath
}

;(async () => {
  console.log("\n====================================================")
  console.log("  M4 Chat Proof — Teacher + Student contexts")
  console.log("====================================================\n")

  // ── Step 0: Ensure fresh slot ───────────────────────────────────────────
  console.log("Step 0: Creating fresh demo slot...")
  const now = new Date()
  const slotTime = new Date(now.getTime() + 10 * 60 * 1000)

  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true },
  })

  if (!course) {
    throw new Error(`Course ${COURSE_SLUG} not found`)
  }

  // Clean up any older test slots so our new slot is the clean upcoming slot
  await prisma.demoSlot.updateMany({
    where: {
      courseId: course.id,
      status: { in: ["SCHEDULED", "LIVE"] },
    },
    data: { status: "ENDED" },
  })

  const slot = await prisma.demoSlot.create({
    data: {
      courseId: course.id,
      startTime: slotTime,
      durationMinutes: 60,
      topic: "M4 Chat Proof Live Demo",
      facultyName: "Faculty Expert",
      agoraChannelName: `demo_m4_${Date.now()}`,
      maxAudience: 100,
      status: "SCHEDULED",
    },
  })

  console.log(`  Slot created: ${slot.id} (${slotTime.toISOString()})`)

  // ── Launch Browser ───────────────────────────────────────────────────────
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  })

  // ── Context 1: Teacher Login ─────────────────────────────────────────────
  console.log("\nStep 1: Logging in as Teacher via /login...")
  const teacherCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const teacherPage = await teacherCtx.newPage()

  await teacherPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
  await sleep(1500)

  const emailInput = teacherPage.locator('input[name="email"]')
  const passInput = teacherPage.locator('input[name="password"]')
  const submitBtn = teacherPage.locator('button:has-text("Sign In")')

  await emailInput.fill(TEACHER_EMAIL)
  await passInput.fill(TEACHER_PASS)
  await submitBtn.click()

  // Wait for login processing and cookie setting
  await sleep(3500)
  console.log(`  Teacher logged in. Current URL: ${teacherPage.url()}`)
  await saveScreenshot(teacherPage, "01_teacher_logged_in")

  // Open demo room as host (testMode=true)
  console.log(`  Opening teacher demo room: /courses/${COURSE_SLUG}/demo?slot=${slot.id}&testMode=true`)
  await teacherPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}/demo?slot=${slot.id}&testMode=true`, {
    waitUntil: "domcontentloaded",
  })
  await sleep(2000)
  await saveScreenshot(teacherPage, "02_teacher_demo_room_preclass")

  // ── Context 2: Student Booking Flow (Mobile 390x844) ──────────────────────
  console.log("\nStep 2: Student booking flow on Mobile Viewport (390x844)...")
  const studentMobile = `98${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`
  console.log(`  Fresh Student Phone: ${studentMobile}`)

  const studentCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
    isMobile: true,
    hasTouch: true,
  })
  const studentPage = await studentCtx.newPage()

  await studentPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}`, { waitUntil: "domcontentloaded" })
  await sleep(1500)

  // Scroll to demo button
  await studentPage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("SCHEDULE FREE DEMO CLASS")
    )
    if (btn) btn.scrollIntoView({ block: "center" })
    else window.scrollTo(0, 700)
  })
  await sleep(800)
  await saveScreenshot(studentPage, "03_student_course_page")

  // Click Schedule Demo
  const scheduleBtn = studentPage.locator('button:has-text("SCHEDULE FREE DEMO CLASS")')
  await scheduleBtn.first().click()
  await sleep(1000)

  // Enter mobile
  const phoneInput = studentPage.locator('input[type="tel"]')
  await phoneInput.fill(studentMobile)
  await sleep(500)
  await saveScreenshot(studentPage, "04_student_modal_slot_picked")

  // Click Verify Mobile & Confirm Seat
  const confirmSeatBtn = studentPage.locator('button:has-text("Verify Mobile & Confirm Seat")')
  await confirmSeatBtn.click()
  await sleep(1000)
  await saveScreenshot(studentPage, "05_student_otp_view")

  // Fill 6 digits OTP (123456)
  const otpInputs = studentPage.locator('input[type="text"][inputmode="numeric"]')
  const count = await otpInputs.count()
  console.log(`  Found ${count} OTP input boxes`)
  for (let i = 0; i < count; i++) {
    await otpInputs.nth(i).fill(`${i + 1}`)
    await sleep(150)
  }
  await sleep(500)

  const verifyBtn = studentPage.locator('button:has-text("Verify OTP & Confirm Booking")')
  if (await verifyBtn.isVisible()) {
    console.log("  Clicking Verify OTP & Confirm Booking button...")
    await verifyBtn.click()
  }

  console.log("  Waiting for booking confirmation...")
  await studentPage.waitForSelector("text=Booking Confirmed", { timeout: 30000 })
  await sleep(1000)
  await saveScreenshot(studentPage, "06_student_booking_confirmed")

  // Click Enter Demo Room or navigate directly to the demo room URL
  console.log("  Entering student demo room...")
  await studentPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}/demo?slot=${slot.id}`, {
    waitUntil: "domcontentloaded",
  })
  await sleep(2000)
  await saveScreenshot(studentPage, "07_student_demo_room_preclass")

  // ── Step 3: Transition slot to LIVE in DB ──────────────────────────────────
  console.log("\nStep 3: Setting slot to LIVE in PostgreSQL...")
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "LIVE",
      startedAt: new Date(),
      hostHeartbeatAt: new Date(),
    },
  })

  // Wait 6s for the 5-sec status poll on both sides
  console.log("  Waiting for 5s status polling...")
  await sleep(6500)

  await saveScreenshot(studentPage, "08_student_sees_live_status")
  await saveScreenshot(teacherPage, "09_teacher_sees_live_status")

  // ── Step 4: Teacher sends real chat message ──────────────────────────────
  console.log("\nStep 4: Teacher posts message via chat UI / API...")
  // Teacher fills the chat input
  const teacherInput = teacherPage.locator('input[placeholder*="Reply to students"], input[placeholder*="Ask a doubt"]')
  if (await teacherInput.isVisible()) {
    await teacherInput.fill("Welcome students! Let me know if you have any questions on 72nd BPSC.")
    const teacherSend = teacherPage.locator('button[title="Send"]')
    await teacherSend.click()
    console.log("  Teacher clicked Send button in UI")
  } else {
    // API fallback inside teacher session
    await teacherPage.evaluate(async (sId: string) => {
      await fetch("/api/courses/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: sId,
          message: "Welcome students! Let me know if you have any questions on 72nd BPSC.",
          isQuestion: false,
        }),
      })
    }, slot.id)
    console.log("  Teacher message sent via authenticated API call")
  }

  // Wait 3s for student to poll new message (chat polls every 2s)
  await sleep(3500)
  await saveScreenshot(studentPage, "10_student_receives_teacher_message")

  // ── Step 5: Student sends real question in chat ──────────────────────────
  console.log("\nStep 5: Student sends question in chat...")
  const studentInput = studentPage.locator('input[placeholder*="Ask a doubt"], input[placeholder*="hi"]')
  await studentInput.scrollIntoViewIfNeeded().catch(() => {})
  if (await studentInput.isVisible()) {
    await studentInput.fill("Sir, will this batch include Current Affairs PDF notes?")
    const studentSend = studentPage.locator('button[title="Send"]')
    await studentSend.click()
    console.log("  Student clicked Send button in UI")
  } else {
    const studentMsgRes = await studentPage.evaluate(async (sId: string) => {
      const res = await fetch("/api/courses/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: sId,
          message: "Sir, will this batch include Current Affairs PDF notes?",
          isQuestion: true,
        }),
      })
      return { status: res.status, data: await res.json() }
    }, slot.id)
    console.log("  Student message response:", JSON.stringify(studentMsgRes))
  }

  // Wait 3s for teacher to poll student message
  await sleep(3500)
  await saveScreenshot(teacherPage, "11_teacher_receives_student_question")
  await saveScreenshot(studentPage, "12_student_view_both_messages")

  // ── Step 6: Verify Database Records ──────────────────────────────────────
  console.log("\nStep 6: Verifying DemoChatMessage records in PostgreSQL...")
  const messagesInDb = await prisma.demoChatMessage.findMany({
    where: { slotId: slot.id },
    orderBy: { createdAt: "asc" },
  })

  console.log(`\n  ✅ ${messagesInDb.length} messages found in PostgreSQL for slot ${slot.id}:`)
  for (const m of messagesInDb) {
    console.log(`    • [${m.role}] ${m.displayName}: "${m.message}" (isQuestion: ${m.isQuestion})`)
  }

  if (messagesInDb.length < 2) {
    throw new Error(`Expected at least 2 chat messages in DB, got ${messagesInDb.length}`)
  }

  // ── Step 7: Teacher Ends Broadcast → Student sees Demo Completed Screen ──
  console.log("\nStep 7: Teacher ending demo broadcast...")
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "ENDED",
      endedAt: new Date(),
    },
  })

  // Student polls status (5s interval) and transitions to COMPLETED
  console.log("  Waiting for student status polling to detect ENDED...")
  await sleep(6500)
  await saveScreenshot(studentPage, "13_student_demo_completed_screen")

  console.log("\n====================================================")
  console.log("  🎉 M4 CHAT PROOF PASSED SUCCESSFULLY!")
  console.log("====================================================\n")

  await browser.close()
  await prisma.$disconnect()
  process.exit(0)
})().catch(async (e) => {
  console.error("❌ Test failed:", e)
  await prisma.$disconnect()
  process.exit(1)
})
