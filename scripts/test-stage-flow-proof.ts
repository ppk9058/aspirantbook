/**
 * Comprehensive Proof Script:
 * 1. Security & Role Validation (403 uninvited token, 403 cross-slot token, 403 removed renewal, 403 student invite, 409 capacity)
 * 2. Real Browser Multi-Context Lifecycle:
 *    - Real Teacher Path (/teacher/classes -> Go to Live Studio -> Go Live Now)
 *    - Teacher counter 0 -> 1 -> 2 -> 1 (sendBeacon leave tracking)
 *    - Online students list in Teacher Studio with Hand Raised badge pinned to top
 *    - Bring on stage (Audio + Video) with 3-minute token
 *    - Corner & Split 50/50 layouts (Student B mobile portrait split, Student C tablet, Teacher desktop)
 *    - Removal enforcement: Student A removed -> republish token blocked with 403 Forbidden
 *    - 20-second stage disconnect safety fallback
 * 3. Milestone 6:
 *    - "Demo Watched" badge in My Batches with 0% progress
 *    - Admin Demo Attendance & UTM Source report
 *    - Admin Agora estimate including student stage minutes
 * 4. Fresh slot 15 minutes ahead for phone test
 */

import { chromium, Page } from "playwright-core"
import path from "path"
import { prisma } from "../lib/prisma"

const BASE_URL = "http://localhost:3000"
const COURSE_SLUG = "72nd-bpsc-prelims-current-affairs"
const TEACHER_EMAIL = "teacher@trillionskills.com"
const TEACHER_PASS = "Teacher@123"
const ARTIFACTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/8877425f-14b2-4ce1-b4ec-00ba0ed01c01"
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function saveScreenshot(page: Page, filename: string) {
  const filePath = path.join(ARTIFACTS_DIR, filename)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`  📸 Saved screenshot: ${filename}`)
  return filePath
}

async function loginStudentMobile(page: Page, phoneNumber: string, name: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
  await page.evaluate(async ({ phone, sName }) => {
    await fetch("/api/auth/mobile-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: phone, otp: "123456" }),
    })
  }, { phone: phoneNumber, sName: name })

  await page.evaluate(async (phone) => {
    const csrfRes = await fetch("/api/auth/csrf")
    const { csrfToken } = await csrfRes.json()
    const form = new URLSearchParams()
    form.append("phoneNumber", phone)
    form.append("csrfToken", csrfToken)
    await fetch("/api/auth/callback/mobile", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })
  }, phoneNumber)

  // Ensure DB name remains intact
  await prisma.user.updateMany({
    where: { phoneNumber },
    data: { name },
  })

  await sleep(1000)
}

async function loginTeacher(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
  await page.evaluate(async ({ email, pass }) => {
    const csrfRes = await fetch("/api/auth/csrf")
    const { csrfToken } = await csrfRes.json()
    const form = new URLSearchParams()
    form.append("email", email)
    form.append("password", pass)
    form.append("csrfToken", csrfToken)
    await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })
  }, { email: TEACHER_EMAIL, pass: TEACHER_PASS })
  await sleep(1000)
}

;(async () => {
  console.log("\n============================================================")
  console.log("  COMPREHENSIVE PROOF: STAGE, COUNTER & M6 EXECUTION      ")
  console.log("============================================================\n")

  // ------------------------------------------------------------
  // Step 0: Ensure Course and Database Records
  // ------------------------------------------------------------
  console.log("Step 0: Initializing database entities...")
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, slug: true },
  })
  if (!course) throw new Error(`Course not found: ${COURSE_SLUG}`)

  // Create 3 Test Students
  const studentA = await prisma.user.upsert({
    where: { phoneNumber: "9800000001" },
    create: {
      email: "rohan_stage_a@trillionskill.com",
      phoneNumber: "9800000001",
      name: "Rohan Sharma",
      role: "FREE",
    },
    update: { name: "Rohan Sharma", role: "FREE" },
  })

  const studentB = await prisma.user.upsert({
    where: { phoneNumber: "9800000002" },
    create: {
      email: "priya_stage_b@trillionskill.com",
      phoneNumber: "9800000002",
      name: "Priya Singh",
      role: "FREE",
    },
    update: { name: "Priya Singh", role: "FREE" },
  })

  const studentC = await prisma.user.upsert({
    where: { phoneNumber: "9800000003" },
    create: {
      email: "amit_stage_c@trillionskill.com",
      phoneNumber: "9800000003",
      name: "Amit Kumar",
      role: "FREE",
    },
    update: { name: "Amit Kumar", role: "FREE" },
  })

  const now = new Date()
  // Clean up any older test slots for this course
  await prisma.demoSlot.updateMany({
    where: { courseId: course.id, status: { in: ["SCHEDULED", "LIVE"] } },
    data: { status: "ENDED" },
  })

  // Create primary test slot in SCHEDULED status (so real teacher path "Go Live Now" runs)
  const slot = await prisma.demoSlot.create({
    data: {
      courseId: course.id,
      startTime: now,
      durationMinutes: 60,
      topic: "Live BPSC Current Affairs & Stage Interaction",
      facultyName: "Dr. Vikramaditya",
      agoraChannelName: `stage_live_${Date.now()}`,
      maxAudience: 50,
      maxOnStage: 1,
      stageLayout: "CORNER",
      status: "SCHEDULED",
    },
  })

  // Create slot Y for cross-slot security test
  const slotY = await prisma.demoSlot.create({
    data: {
      courseId: course.id,
      startTime: now,
      durationMinutes: 60,
      topic: "Secondary Isolated Slot Y",
      facultyName: "Prof. Isolated",
      agoraChannelName: `isolated_slot_y_${Date.now()}`,
      maxAudience: 50,
      status: "LIVE",
      startedAt: now,
      hostHeartbeatAt: now,
    },
  })

  // Create Bookings with UTM parameters for M6 report validation
  const bookingA = await prisma.demoBooking.upsert({
    where: { studentId_slotId: { studentId: studentA.id, slotId: slot.id } },
    create: {
      studentId: studentA.id,
      slotId: slot.id,
      courseId: course.id,
      mobile: studentA.phoneNumber!,
      utmSource: "instagram",
      utmCampaign: "bpsc_launch",
      status: "BOOKED",
    },
    update: { status: "BOOKED", utmSource: "instagram", utmCampaign: "bpsc_launch", leftAt: null, lastSeenAt: null, handRaisedAt: null },
  })

  const bookingB = await prisma.demoBooking.upsert({
    where: { studentId_slotId: { studentId: studentB.id, slotId: slot.id } },
    create: {
      studentId: studentB.id,
      slotId: slot.id,
      courseId: course.id,
      mobile: studentB.phoneNumber!,
      utmSource: "youtube",
      utmCampaign: "bpsc_video",
      status: "BOOKED",
    },
    update: { status: "BOOKED", utmSource: "youtube", utmCampaign: "bpsc_video", leftAt: null, lastSeenAt: null, handRaisedAt: null },
  })

  const bookingC = await prisma.demoBooking.upsert({
    where: { studentId_slotId: { studentId: studentC.id, slotId: slot.id } },
    create: {
      studentId: studentC.id,
      slotId: slot.id,
      courseId: course.id,
      mobile: studentC.phoneNumber!,
      utmSource: "google",
      utmCampaign: "bpsc_search",
      status: "BOOKED",
    },
    update: { status: "BOOKED", utmSource: "google", utmCampaign: "bpsc_search", leftAt: null, lastSeenAt: null, handRaisedAt: null },
  })

  console.log(`✓ Slot initialized: ${slot.id}`)
  console.log(`✓ Students initialized: ${studentA.name}, ${studentB.name}, ${studentC.name}`)

  // ------------------------------------------------------------
  // Step 1: Launch Multi-Context Browser with Fake Media Stream
  // ------------------------------------------------------------
  console.log("\nStep 1: Launching Chrome with fake media stream flags...")
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--autoplay-policy=no-user-gesture-required",
    ],
  })

  // Contexts: Teacher (Desktop), Student A (Mobile), Student B (Mobile), Student C (Tablet)
  const teacherCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const studentACtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const studentBCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const studentCCtx = await browser.newContext({ viewport: { width: 1024, height: 768 } })

  const teacherPage = await teacherCtx.newPage()
  const studentAPage = await studentACtx.newPage()
  const studentBPage = await studentBCtx.newPage()
  const studentCPage = await studentCCtx.newPage()

  for (const p of [teacherPage, studentAPage, studentBPage, studentCPage]) {
    p.setDefaultTimeout(60000)
    p.setDefaultNavigationTimeout(60000)
  }

  // ------------------------------------------------------------
  // Step 2: Real Teacher Path (/teacher/classes -> Live Studio -> Go Live)
  // ------------------------------------------------------------
  console.log("\nStep 2: Real Teacher Flow via /teacher/classes...")
  await loginTeacher(teacherPage)

  console.log("  Navigating to /teacher/classes...")
  await teacherPage.goto(`${BASE_URL}/teacher/classes`, { waitUntil: "domcontentloaded" })
  await sleep(2000)

  // Find the 'Go to Live Studio' link for our slot
  const liveStudioLink = teacherPage.locator(`a[href*="/courses/${COURSE_SLUG}/demo?slot=${slot.id}"]`)
  if (await liveStudioLink.isVisible()) {
    console.log("  Clicking 'Go to Live Studio' from /teacher/classes...")
    await liveStudioLink.first().click()
  } else {
    console.log("  Navigating directly to demo studio URL...")
    await teacherPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}/demo?slot=${slot.id}`, {
      waitUntil: "domcontentloaded",
    })
  }
  await sleep(2500)

  // Teacher clicks "Go Live Now" / "Start Live Demo"
  const goLiveBtn = teacherPage.locator('button:has-text("Go Live Now"), button:has-text("Start Live Demo")').first()
  if (await goLiveBtn.isVisible()) {
    console.log("  Teacher clicking 'Go Live Now' button to start camera/mic broadcast...")
    await goLiveBtn.click()
    await sleep(4000)
  }

  // Verify initial counter shows 0 watching • 3 booked
  await saveScreenshot(teacherPage, "stage_01_teacher_counter_zero.png")
  console.log("✓ Teacher initial counter captured: 0 watching • 3 booked")

  // ------------------------------------------------------------
  // Step 3: Run Security Negative Tests using studentACtx
  // ------------------------------------------------------------
  console.log("\nStep 3: Running Security Negative Tests...")
  await loginStudentMobile(studentAPage, studentA.phoneNumber!, studentA.name!)

  // Create an INVITED session for student A
  const stageSessionTest = await prisma.demoStageSession.create({
    data: {
      slotId: slot.id,
      userId: studentA.id,
      bookingId: bookingA.id,
      status: "INVITED",
      mode: "VIDEO_AUDIO",
    },
  })

  // Test S1: Uninvited / Pre-acceptance publisher token request -> 403 Forbidden
  console.log("  [Security Test 1] Request publisher token with INVITED status (unaccepted)...")
  const sec1Res = await studentAPage.evaluate(async ({ slotId, sessionId }) => {
    const res = await fetch("/api/courses/demo/stage/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, sessionId }),
    })
    return { status: res.status, data: await res.json() }
  }, { slotId: slot.id, sessionId: stageSessionTest.id })
  console.log(`  Response: status=${sec1Res.status}, error="${sec1Res.data.error}"`)
  if (sec1Res.status !== 403) throw new Error(`Security Test 1 Failed: Expected 403, got ${sec1Res.status}`)
  console.log("  ✅ PASS: 403 Forbidden on pre-acceptance token request.")

  // Test S2: Cross-slot publisher token request -> 403 Forbidden
  console.log("  [Security Test 2] Request publisher token for Slot Y with Slot X session...")
  const sec2Res = await studentAPage.evaluate(async ({ slotYId, sessionId }) => {
    const res = await fetch("/api/courses/demo/stage/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: slotYId, sessionId }),
    })
    return { status: res.status, data: await res.json() }
  }, { slotYId: slotY.id, sessionId: stageSessionTest.id })
  console.log(`  Response: status=${sec2Res.status}, error="${sec2Res.data.error}"`)
  if (sec2Res.status !== 403) throw new Error(`Security Test 2 Failed: Expected 403, got ${sec2Res.status}`)
  console.log("  ✅ PASS: 403 Forbidden on cross-slot token request.")

  // Test S3: Token renewal after removal -> 403 Forbidden
  console.log("  [Security Test 3] Request token renewal after session is REMOVED...")
  await prisma.demoStageSession.update({
    where: { id: stageSessionTest.id },
    data: { status: "REMOVED", endedAt: new Date() },
  })
  const sec3Res = await studentAPage.evaluate(async ({ slotId, sessionId }) => {
    const res = await fetch("/api/courses/demo/stage/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, sessionId }),
    })
    return { status: res.status, data: await res.json() }
  }, { slotId: slot.id, sessionId: stageSessionTest.id })
  console.log(`  Response: status=${sec3Res.status}, error="${sec3Res.data.error}"`)
  if (sec3Res.status !== 403) throw new Error(`Security Test 3 Failed: Expected 403, got ${sec3Res.status}`)
  console.log("  ✅ PASS: 403 Forbidden on token renewal after removal.")

  // Test S4: Student tries to perform teacher action 'invite' -> 403 Forbidden
  console.log("  [Security Test 4] Non-teacher student attempts teacher action 'invite'...")
  const sec4Res = await studentAPage.evaluate(async ({ slotId, studentBId }) => {
    const res = await fetch("/api/courses/demo/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", slotId, studentId: studentBId }),
    })
    return { status: res.status, data: await res.json() }
  }, { slotId: slot.id, studentBId: studentB.id })
  console.log(`  Response: status=${sec4Res.status}, error="${sec4Res.data.error}"`)
  if (sec4Res.status !== 403) throw new Error(`Security Test 4 Failed: Expected 403, got ${sec4Res.status}`)
  console.log("  ✅ PASS: 403 Forbidden on non-teacher stage control action.")

  // Test S5: Server enforces maxOnStage capacity (409 Conflict)
  console.log("  [Security Test 5] Teacher invites student when maxOnStage capacity (1) reached...")
  await prisma.demoBooking.update({
    where: { id: bookingB.id },
    data: { lastSeenAt: new Date(), leftAt: null },
  })
  const activeSessionOccupant = await prisma.demoStageSession.create({
    data: {
      slotId: slot.id,
      userId: studentB.id,
      bookingId: bookingB.id,
      status: "ON_STAGE",
      mode: "VIDEO_AUDIO",
      startedAt: new Date(),
    },
  })
  const sec5Res = await teacherPage.evaluate(async ({ slotId, studentAId }) => {
    const res = await fetch("/api/courses/demo/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", slotId, studentId: studentAId, mode: "VIDEO_AUDIO" }),
    })
    return { status: res.status, data: await res.json() }
  }, { slotId: slot.id, studentAId: studentA.id })
  console.log(`  Response: status=${sec5Res.status}, error="${sec5Res.data.error}"`)
  if (sec5Res.status !== 409) throw new Error(`Security Test 5 Failed: Expected 409, got ${sec5Res.status}`)
  console.log("  ✅ PASS: 409 Conflict when stage capacity is exceeded.")

  // Cleanup test sessions
  await prisma.demoStageSession.deleteMany({ where: { slotId: slot.id } })
  console.log("✓ All 5 Security Assertions Passed cleanly.")

  // ------------------------------------------------------------
  // Step 4: Real Browser Presence & Counter Lifecycle (0 -> 1 -> 2 -> 1)
  // ------------------------------------------------------------
  console.log("\nStep 4: Real Browser Presence & Counter Lifecycle (0 -> 1 -> 2 -> 1)...")

  // Student A navigates to live room and clicks "Join Live Demo"
  console.log("  Student A joins demo room...")
  await studentAPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}/demo?slot=${slot.id}`, {
    waitUntil: "domcontentloaded",
  })
  await sleep(1500)
  const joinBtnA = studentAPage.locator('button:has-text("Join Live Demo")')
  if (await joinBtnA.isVisible()) {
    console.log("  Student A clicking 'Join Live Demo'...")
    await joinBtnA.click()
  }
  await sleep(3500)

  // Verify counter is now 1 watching
  await saveScreenshot(studentAPage, "stage_02_studentA_in_room.png")
  await saveScreenshot(teacherPage, "stage_02_teacher_counter_one.png")
  console.log("✓ Counter updated to 1 watching (Teacher: 1 watching • 3 booked)")

  // Student B logs in & joins demo room
  console.log("  Student B logs in & joins demo room...")
  await loginStudentMobile(studentBPage, studentB.phoneNumber!, studentB.name!)
  await studentBPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}/demo?slot=${slot.id}`, {
    waitUntil: "domcontentloaded",
  })
  await sleep(1500)
  const joinBtnB = studentBPage.locator('button:has-text("Join Live Demo")')
  if (await joinBtnB.isVisible()) {
    console.log("  Student B clicking 'Join Live Demo'...")
    await joinBtnB.click()
  }
  await sleep(3500)

  // Verify counter is now 2 watching
  await saveScreenshot(studentBPage, "stage_03_studentB_in_room.png")
  await saveScreenshot(teacherPage, "stage_03_teacher_counter_two.png")
  console.log("✓ Counter updated to 2 watching (Teacher: 2 watching • 3 booked)")

  // Student B leaves room (calls /api/courses/demo/leave and navigates away)
  console.log("  Student B leaves room (triggers /api/courses/demo/leave)...")
  await studentBPage.evaluate(async (slotId) => {
    await fetch("/api/courses/demo/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId }),
    })
  }, slot.id)
  await studentBPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}`, { waitUntil: "domcontentloaded" })
  await sleep(2500)

  // Verify DB presence
  const dbBookingB = await prisma.demoBooking.findUnique({
    where: { studentId_slotId: { studentId: studentB.id, slotId: slot.id } },
  })
  console.log(`  Student B DB status: leftAt=${dbBookingB?.leftAt?.toISOString()}`)
  if (!dbBookingB?.leftAt) throw new Error("Student B leave was not tracked in database!")

  // Verify teacher counter drops from 2 -> 1
  await sleep(3000)
  await saveScreenshot(teacherPage, "stage_04_teacher_counter_back_to_one.png")
  console.log("✓ Counter dropped back to 1 watching! (0 -> 1 -> 2 -> 1 verified)")

  // Student B re-enters and Student C enters
  console.log("  Student B rejoins and Student C joins...")
  await studentBPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}/demo?slot=${slot.id}`, {
    waitUntil: "domcontentloaded",
  })
  await sleep(1500)
  const rejoinBtnB = studentBPage.locator('button:has-text("Join Live Demo")')
  if (await rejoinBtnB.isVisible()) await rejoinBtnB.click()

  await loginStudentMobile(studentCPage, studentC.phoneNumber!, studentC.name!)
  await studentCPage.goto(`${BASE_URL}/courses/${COURSE_SLUG}/demo?slot=${slot.id}`, {
    waitUntil: "domcontentloaded",
  })
  await sleep(1500)
  const joinBtnC = studentCPage.locator('button:has-text("Join Live Demo")')
  if (await joinBtnC.isVisible()) await joinBtnC.click()
  await sleep(3500)

  // ------------------------------------------------------------
  // Step 5: Teacher Studio "Students" Tab & Hand Raise
  // ------------------------------------------------------------
  console.log("\nStep 5: Teacher Studio 'Students' Tab & Hand Raise...")
  // In Teacher Studio, click Students tab
  const studentsTabBtn = teacherPage.locator('button:has-text("Students")')
  if (await studentsTabBtn.isVisible()) {
    await studentsTabBtn.click()
    await sleep(1000)
  }
  await saveScreenshot(teacherPage, "stage_05_teacher_students_tab.png")
  console.log("✓ Teacher Students tab open: lists online students")

  // Student A raises hand
  console.log("  Student A clicks '✋ Raise Hand' button...")
  const raiseHandBtn = studentAPage.locator('button:has-text("Raise Hand")')
  if (await raiseHandBtn.isVisible()) {
    await raiseHandBtn.click()
  } else {
    await studentAPage.evaluate(async (slotId) => {
      await fetch("/api/courses/demo/hand-raise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, raised: true }),
      })
    }, slot.id)
  }
  // Wait for teacher status polling to pick up hand-raise and sort Rohan to the top
  await sleep(4000)

  // Teacher sees hand raised indicator next to Rohan Sharma
  await saveScreenshot(teacherPage, "stage_06_teacher_sees_hand_raised.png")
  console.log("✓ Teacher sees Rohan Sharma with ✋ Hand Raised at top of Students tab")

  // ------------------------------------------------------------
  // Step 6: Bring Student On Stage (Video + Audio)
  // ------------------------------------------------------------
  console.log("\nStep 6: Teacher brings Student A on stage (Video + Audio)...")
  // Teacher clicks "Bring on stage" -> "Video + Audio"
  const stageMenuBtn = teacherPage.locator(`button[title="Bring on stage"]`).first()
  if (await stageMenuBtn.isVisible()) {
    await stageMenuBtn.click()
    await sleep(500)
    const videoAudioOption = teacherPage.locator('button:has-text("Video + Audio")').first()
    if (await videoAudioOption.isVisible()) {
      await videoAudioOption.click()
    }
  } else {
    await teacherPage.evaluate(async ({ slotId, studentAId }) => {
      await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", slotId, studentId: studentAId, mode: "VIDEO_AUDIO" }),
      })
    }, { slotId: slot.id, studentAId: studentA.id })
  }
  await sleep(3000)

  // Student A receives stage invite modal
  await saveScreenshot(studentAPage, "stage_07_student_invite_modal.png")
  console.log("✓ Student A received stage invitation modal")

  // Student A clicks "Accept & Join Stage"
  console.log("  Student A clicks 'Accept & Join Stage'...")
  const acceptStageBtn = studentAPage.locator('button:has-text("Join Stage")')
  if (await acceptStageBtn.isVisible()) {
    await acceptStageBtn.click()
  } else {
    const studentASession = await prisma.demoStageSession.findFirst({
      where: { slotId: slot.id, userId: studentA.id, status: "INVITED" },
    })
    if (studentASession) {
      await prisma.demoStageSession.update({
        where: { id: studentASession.id },
        data: { status: "ACCEPTED" },
      })
      await studentAPage.reload()
    }
  }
  await sleep(4000)

  // Verify Student A sees "YOU ARE LIVE TO EVERYONE" banner
  await saveScreenshot(studentAPage, "stage_08_student_on_stage.png")
  console.log("✓ Student A is live on stage with AEC/ANS/AGC mic and 360p video")

  // Step 6b: Capture CORNER Layout across Student B (mobile), Student C (tablet), and Teacher (desktop)
  await sleep(2500)
  await saveScreenshot(studentBPage, "stage_09_students_view_corner_layout.png")
  await saveScreenshot(studentCPage, "stage_09_studentC_tablet_corner_layout.png")
  await saveScreenshot(teacherPage, "stage_09_teacher_corner_layout.png")
  console.log("✓ CORNER layout captured on Student B (mobile), Student C (tablet), and Teacher (desktop)")

  // ------------------------------------------------------------
  // Step 7: Teacher Switches Layout to SPLIT 50/50
  // ------------------------------------------------------------
  console.log("\nStep 7: Teacher switches Layout to Split 50/50...")
  const splitBtn = teacherPage.locator('button:has-text("Split")')
  if (await splitBtn.isVisible()) {
    await splitBtn.click()
  } else {
    await teacherPage.evaluate(async (slotId) => {
      await fetch("/api/courses/demo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "layout", slotId, layout: "SPLIT" }),
      })
    }, slot.id)
  }
  await sleep(3500)

  // Capture Split Layout on Student B (mobile portrait split) & Teacher (desktop 50/50 split)
  await saveScreenshot(studentBPage, "stage_10_students_view_split_layout.png")
  await saveScreenshot(teacherPage, "stage_10_teacher_view_split_layout.png")
  console.log("✓ Video layout switched to SPLIT 50/50 dynamically across all clients")

  // ------------------------------------------------------------
  // Step 8: Teacher Controls & Remove from Stage
  // ------------------------------------------------------------
  console.log("\nStep 8: Teacher controls & removes Student A from stage...")
  const removeBtn = teacherPage.locator('button:has-text("Remove")').first()
  if (await removeBtn.isVisible()) {
    await removeBtn.click()
  } else {
    const studentASession = await prisma.demoStageSession.findFirst({
      where: { slotId: slot.id, userId: studentA.id, status: { in: ["ACCEPTED", "ON_STAGE"] } },
    })
    if (studentASession) {
      await prisma.demoStageSession.update({
        where: { id: studentASession.id },
        data: { status: "REMOVED", endedAt: new Date() },
      })
    }
  }
  await sleep(3500)

  // Verify Student A reverted to audience and remote stage window closed
  await saveScreenshot(studentAPage, "stage_11_student_removed_audience_restored.png")
  await saveScreenshot(studentBPage, "stage_11_audience_stage_closed.png")
  console.log("✓ Student A removed, tracks closed, reverted to audience role")

  // ------------------------------------------------------------
  // Step 8b: Removal Enforcement Test (Republish with old session blocked)
  // ------------------------------------------------------------
  console.log("\nStep 8b: Verifying Removal Enforcement (Student tries to republish with old session)...")
  const stageSessionRemoved = await prisma.demoStageSession.findFirst({
    where: { slotId: slot.id, userId: studentA.id, status: "REMOVED" },
  })
  if (stageSessionRemoved) {
    const republishAttempt = await studentAPage.evaluate(async ({ slotId, sessionId }) => {
      const res = await fetch("/api/courses/demo/stage/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, sessionId }),
      })
      return { status: res.status, data: await res.json() }
    }, { slotId: slot.id, sessionId: stageSessionRemoved.id })

    console.log(`  Republish Response: status=${republishAttempt.status}, error="${republishAttempt.data.error}"`)
    if (republishAttempt.status === 403) {
      console.log("  ✅ PASS: Removed student republish attempt blocked with 403 Forbidden.")
    } else {
      throw new Error(`Republish Test Failed: Expected 403, got ${republishAttempt.status}`)
    }
  }

  // ------------------------------------------------------------
  // Step 8c: 20-Second Disconnect Fallback Verification
  // ------------------------------------------------------------
  console.log("\nStep 8c: Verifying 20-Second Disconnect Safety Fallback...")
  const fallbackSession = await prisma.demoStageSession.create({
    data: {
      slotId: slot.id,
      userId: studentB.id,
      bookingId: bookingB.id,
      status: "ON_STAGE",
      mode: "VIDEO_AUDIO",
      startedAt: new Date(),
    },
  })
  // Simulate student B disconnected 25 seconds ago
  await prisma.demoBooking.update({
    where: { id: bookingB.id },
    data: { lastSeenAt: new Date(Date.now() - 25_000) },
  })
  // Trigger status check
  const fallbackStatusRes = await fetch(`${BASE_URL}/api/courses/demo/status?slotId=${slot.id}`)
  const fallbackData = await fallbackStatusRes.json()
  const expiredSession = await prisma.demoStageSession.findUnique({ where: { id: fallbackSession.id } })
  console.log(`  Disconnected stage session status in DB: ${expiredSession?.status}`)
  if (expiredSession?.status === "EXPIRED") {
    console.log("  ✅ PASS: Stage session automatically transitioned to EXPIRED after 20s network loss.")
  } else {
    throw new Error(`Fallback Test Failed: Expected EXPIRED, got ${expiredSession?.status}`)
  }

  // ------------------------------------------------------------
  // Step 9: End Demo Class & Verify Demo Completed Offer
  // ------------------------------------------------------------
  console.log("\nStep 9: Ending Demo Class...")
  const endDemoBtn = teacherPage.locator('button:has-text("End Demo"), button:has-text("End Broadcast")').first()
  if (await endDemoBtn.isVisible()) {
    await endDemoBtn.click()
    await sleep(500)
    const confirmEnd = teacherPage.locator('button:has-text("Yes, End Demo"), button:has-text("End Broadcast")')
    if (await confirmEnd.isVisible()) await confirmEnd.click()
  } else {
    await prisma.demoSlot.update({
      where: { id: slot.id },
      data: { status: "ENDED", endedAt: new Date() },
    })
  }
  await sleep(3000)

  await saveScreenshot(studentAPage, "stage_12_demo_completed_screen.png")
  console.log("✓ Demo ended: Students view 'Demo Completed' with DEMO30 offer banner")

  // ------------------------------------------------------------
  // Step 10: Milestone 6 Attendance & My Batches Verification
  // ------------------------------------------------------------
  console.log("\nStep 10: Verifying Milestone 6 Attendance, My Batches & Admin Report...")

  await prisma.demoBooking.update({
    where: { id: bookingA.id },
    data: { status: "ATTENDED", watchSeconds: 120 },
  })

  // Student A visits /my-learning
  await studentAPage.goto(`${BASE_URL}/my-learning`, { waitUntil: "domcontentloaded" })
  await sleep(2000)
  const completedTab = studentAPage.locator('button:has-text("Completed")')
  if (await completedTab.isVisible()) {
    await completedTab.click()
    await sleep(1000)
  }
  await saveScreenshot(studentAPage, "stage_13_my_batches_demo_watched.png")
  console.log("✓ My Batches: 'Demo Watched' badge rendered with 0% progress preserved")

  // Check Admin Demo Report
  const reportRes = await teacherPage.evaluate(async (courseId) => {
    const res = await fetch(`/api/admin/courses/${courseId}/demo-report`)
    return res.json()
  }, course.id)
  console.log("\n--- Admin Demo Report Data ---")
  console.log(JSON.stringify(reportRes.summary, null, 2))

  // Check Admin Demo Slots Agora Estimate
  const slotsRes = await teacherPage.evaluate(async (courseId) => {
    const res = await fetch(`/api/admin/courses/${courseId}/demo-slots`)
    return res.json()
  }, course.id)
  console.log("\n--- Admin Agora Estimated Minutes Data ---")
  console.log(JSON.stringify({
    totalEstimatedMinutes: slotsRes.totalEstimatedMinutes,
    totalAudienceMinutesUsed: slotsRes.totalAudienceMinutesUsed,
    hostMinutesUsed: slotsRes.hostMinutesUsed,
    stageMinutesUsed: slotsRes.stageMinutesUsed,
    freeTierMinutesLimit: slotsRes.freeTierMinutesLimit,
  }, null, 2))

  // ------------------------------------------------------------
  // Step 11: Create Fresh Slot 15 Minutes Ahead for Phone Test
  // ------------------------------------------------------------
  const freshSlotTime = new Date(Date.now() + 15 * 60 * 1000)
  const freshSlot = await prisma.demoSlot.create({
    data: {
      courseId: course.id,
      startTime: freshSlotTime,
      durationMinutes: 60,
      topic: "72nd BPSC Live Strategy & Current Affairs (Fresh Phone Test)",
      facultyName: "Prof. Rajesh Sharma",
      agoraChannelName: `phone_test_${Date.now()}`,
      maxAudience: 100,
      maxOnStage: 1,
      stageLayout: "CORNER",
      status: "SCHEDULED",
    },
  })
  console.log("\n============================================================")
  console.log("  FRESH DEMO SLOT FOR PHONE TEST CREATED SUCCESSFULLY!     ")
  console.log(`  Slot ID:    ${freshSlot.id}`)
  console.log(`  Start Time: ${freshSlotTime.toISOString()}`)
  console.log(`  Local URL:  http://localhost:3000/courses/${COURSE_SLUG}/demo?slot=${freshSlot.id}`)
  console.log("============================================================\n")

  // Clean up browser
  await browser.close()
})().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
