import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, loginThroughUi, createActor, slugFor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"
import { istToUtcIso } from "../../lib/demo/slot-utils"

test.describe("Teacher Class Full CRUD, Ownership & Safety E2E", () => {
  test.setTimeout(120_000)

  let nonce: string
  let teacherA: any
  let teacherB: any
  let adminUser: any
  let studentUser: any
  let course: any

  test.beforeAll(async () => {
    nonce = newNonce()
    teacherA = await createActor(nonce, UserRole.TEACHER, "teacher-a")
    teacherB = await createActor(nonce, UserRole.TEACHER, "teacher-b")
    adminUser = await createActor(nonce, UserRole.ADMIN, "admin-user")
    studentUser = await createActor(nonce, UserRole.FREE, "student-user")

    course = await prisma.course.create({
      data: {
        title: `CRUD Course ${nonce}`,
        slug: `crud-course-${slugFor(nonce)}`,
        description: "Test Course for Teacher Class CRUD",
        difficulty: "BEGINNER",
        isPublished: true,
        status: "PUBLISHED",
      },
    })
  })

  test.afterAll(async () => {
    if (course?.id) {
      await prisma.demoBooking.deleteMany({ where: { courseId: course.id } }).catch(() => {})
      await prisma.demoSlot.deleteMany({ where: { courseId: course.id } }).catch(() => {})
      await prisma.course.deleteMany({ where: { id: course.id } }).catch(() => {})
    }
    const userIds = [teacherA?.id, teacherB?.id, adminUser?.id, studentUser?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
  })

  async function mirrorCookies(page: any) {
    const cookies = await page.context().cookies()
    const localhostCookies = cookies.map((c: any) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    }))
    await page.context().addCookies(localhostCookies)
  }

  test("CRUD-01: Create shows join URL card, real slot id, no auto-redirect before clicking, and allows navigation", async ({ page }) => {
    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})
    await mirrorCookies(page)

    await page.goto("/teacher/classes/new", { waitUntil: "domcontentloaded" })
    await expect(page.locator(`select[name="courseId"] option[value="${course.id}"]`)).toBeAttached({ timeout: 15_000 })

    const topicTitle = `Advanced Optics ${nonce}`
    const targetDate = "2028-11-20"
    const targetTime = "14:00"

    await page.fill('input[name="topic"]', topicTitle)
    await page.selectOption('select[name="courseId"]', course.id)
    await page.fill('input[name="date"]', targetDate)
    await page.fill('input[name="time"]', targetTime)
    await page.selectOption('select[name="duration"]', "60")

    await page.getByRole("button", { name: /Confirm Schedule/i }).click()

    // 1. Success card appears with title and "Class scheduled successfully!"
    await expect(page.getByText(topicTitle)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Class scheduled successfully!/i)).toBeVisible()

    // 2. Contains real slot id in the student join URL
    const dbSlot = await prisma.demoSlot.findFirst({ where: { topic: topicTitle } })
    expect(dbSlot).not.toBeNull()
    expect(dbSlot!.createdById).toBe(teacherA.id)
    await expect(page.getByText(new RegExp(`slot=${dbSlot!.id}`))).toBeVisible()

    // 3. Verify no auto-redirect occurs: wait 2 seconds and verify still on /teacher/classes/new
    await page.waitForTimeout(2000)
    expect(page.url()).toContain("/teacher/classes/new")

    // 4. Click "Go to My Classes" to navigate
    await page.getByRole("link", { name: /Go to My Classes/i }).click()
    await page.waitForURL("**/teacher/classes", { timeout: 15_000 })
    await expect(page.getByText(topicTitle)).toBeVisible()
  })

  test("CRUD-02: Edit changes topic, date/time and duration (assert exact UTC in DB)", async ({ page }) => {
    const originalUtc = istToUtcIso("2028-11-20", "10:00")
    const slot = await prisma.demoSlot.create({
      data: {
        createdById: teacherA.id,
        courseId: course.id,
        topic: `Initial Topic ${nonce}`,
        facultyName: "Teacher A",
        startTime: new Date(originalUtc),
        durationMinutes: 60,
        agoraChannelName: `demo_edit_${Date.now()}`,
        status: "SCHEDULED",
      },
    })

    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})
    await mirrorCookies(page)

    await page.goto(`/teacher/classes/${slot.id}/edit`, { waitUntil: "domcontentloaded" })
    await expect(page.locator('input[name="topic"]')).toHaveValue(`Initial Topic ${nonce}`)

    const updatedTopic = `Refined Optics ${nonce}`
    const newDate = "2028-12-25"
    const newTime = "16:30"
    const expectedUtc = istToUtcIso(newDate, newTime)

    await page.fill('input[name="topic"]', updatedTopic)
    await page.fill('input[name="date"]', newDate)
    await page.fill('input[name="time"]', newTime)
    await page.selectOption('select[name="duration"]', "90")

    await page.getByRole("button", { name: /Save Changes/i }).click()

    await expect(page.getByText(/Lecture Updated Successfully!/i)).toBeVisible({ timeout: 15_000 })

    // DB assertion: exact UTC value and duration
    const refreshed = await prisma.demoSlot.findUnique({ where: { id: slot.id } })
    expect(refreshed!.topic).toBe(updatedTopic)
    expect(refreshed!.startTime.toISOString()).toBe(expectedUtc)
    expect(refreshed!.durationMinutes).toBe(90)
  })

  test("CRUD-03: Cancel with bookings shows booking count warning, soft-cancels, and hides from My Classes & demo listing", async ({ page }) => {
    const slot = await prisma.demoSlot.create({
      data: {
        createdById: teacherA.id,
        courseId: course.id,
        topic: `To Cancel Topic ${nonce}`,
        facultyName: "Teacher A",
        startTime: new Date(istToUtcIso("2028-11-20", "11:00")),
        durationMinutes: 60,
        agoraChannelName: `demo_cancel_${Date.now()}`,
        status: "SCHEDULED",
      },
    })

    // Create 2 test bookings
    await prisma.demoBooking.create({
      data: {
        slotId: slot.id,
        studentId: studentUser.id,
        courseId: course.id,
        mobile: "+919876543210",
        status: "BOOKED",
      },
    })

    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})
    await mirrorCookies(page)

    await page.goto("/teacher/classes", { waitUntil: "domcontentloaded" })
    const card = page.locator(`[data-testid="class-card-${slot.id}"]`)
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Click Cancel on that card
    await card.getByRole("button", { name: /Cancel/i }).click()

    // Confirm dialog appears with bookings warning
    const warning = page.locator('[data-testid="cancel-booking-warning"]')
    await expect(warning).toBeVisible({ timeout: 10_000 })
    await expect(warning).toContainText("1 registered student")

    // Click Confirm Cancellation
    await page.getByRole("button", { name: /Confirm Cancellation/i }).click()

    // Slot disappears from My Classes
    await expect(page.locator(`[data-testid="class-card-${slot.id}"]`)).not.toBeVisible({ timeout: 15_000 })

    // Assert soft-cancel (status CANCELLED) in DB (not hard deleted)
    const cancelledSlot = await prisma.demoSlot.findUnique({ where: { id: slot.id } })
    expect(cancelledSlot).not.toBeNull()
    expect(cancelledSlot!.status).toBe("CANCELLED")

    // Assert CANCELLED slot does NOT appear in student-facing demo listing
    const listingRes = await page.request.get(`/api/courses/${course.slug}/demo-slots`)
    expect(listingRes.ok()).toBeTruthy()
    const listingData = await listingRes.json()
    const foundInListing = (listingData.slots || []).some((s: any) => s.id === slot.id)
    expect(foundInListing).toBe(false)
  })

  test("CRUD-04: Ownership: Teacher B cannot see or edit Teacher A's slot (403), Admin can, student/guest blocked", async ({ page, browser }) => {
    const slotA = await prisma.demoSlot.create({
      data: {
        createdById: teacherA.id,
        courseId: course.id,
        topic: `Teacher A Exclusive ${nonce}`,
        facultyName: "Teacher A",
        startTime: new Date(istToUtcIso("2028-11-20", "12:00")),
        durationMinutes: 60,
        agoraChannelName: `demo_own_${Date.now()}`,
        status: "SCHEDULED",
      },
    })

    // 1. Teacher B logged in
    await loginThroughUi(page, teacherB.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})
    await mirrorCookies(page)

    // Teacher B views My Classes -> Teacher A's slot is NOT listed
    await page.goto("/teacher/classes", { waitUntil: "domcontentloaded" })
    await expect(page.getByText(`Teacher A Exclusive ${nonce}`)).not.toBeVisible()

    // Teacher B tries to GET / PATCH Teacher A's slot -> 403
    const teacherBGet = await page.request.get(`/api/teacher/classes/${slotA.id}`)
    expect(teacherBGet.status()).toBe(403)

    const teacherBPatch = await page.request.patch(`/api/teacher/classes/${slotA.id}`, {
      data: { topic: "Hacked Topic" },
    })
    expect(teacherBPatch.status()).toBe(403)

    // 2. Admin can view and edit Teacher A's slot
    const adminPage = await browser.newPage()
    await loginThroughUi(adminPage, adminUser.email)
    await adminPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const adminGet = await adminPage.request.get(`/api/teacher/classes/${slotA.id}`)
    expect(adminGet.status()).toBe(200)

    const adminPatch = await adminPage.request.patch(`/api/teacher/classes/${slotA.id}`, {
      data: { topic: `Admin Modified ${nonce}` },
    })
    expect(adminPatch.status()).toBe(200)
    await adminPage.close()

    // 3. Student is blocked (403)
    const studentPage = await browser.newPage()
    await loginThroughUi(studentPage, studentUser.email)
    await studentPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const studentPatch = await studentPage.request.patch(`/api/teacher/classes/${slotA.id}`, {
      data: { topic: "Student Attempt" },
    })
    expect(studentPatch.status()).toBe(403)
    await studentPage.close()

    // 4. Guest is blocked (401)
    const guestContext = await browser.newContext()
    const guestPatch = await guestContext.request.patch(`http://127.0.0.1:3045/api/teacher/classes/${slotA.id}`, {
      data: { topic: "Guest Attempt" },
    })
    expect(guestPatch.status()).toBe(401)
    await guestContext.close()
  })

  test("CRUD-05: Legacy NULL createdById case: Teacher cannot see or edit it; Admin can", async ({ page, browser }) => {
    const legacySlot = await prisma.demoSlot.create({
      data: {
        createdById: null,
        courseId: course.id,
        topic: `Legacy Null Owner Slot ${nonce}`,
        facultyName: "Legacy Faculty",
        startTime: new Date(istToUtcIso("2028-11-20", "13:00")),
        durationMinutes: 60,
        agoraChannelName: `demo_legacy_${Date.now()}`,
        status: "SCHEDULED",
      },
    })

    // 1. Teacher A cannot see legacy slot in list or edit it (403)
    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})
    await mirrorCookies(page)

    const teacherListRes = await page.request.get("/api/teacher/classes")
    const teacherListData = await teacherListRes.json()
    const isPresentForTeacher = (teacherListData.classes || []).some((c: any) => c.id === legacySlot.id)
    expect(isPresentForTeacher).toBe(false)

    const teacherPatchRes = await page.request.patch(`/api/teacher/classes/${legacySlot.id}`, {
      data: { topic: "Teacher modifying legacy" },
    })
    expect(teacherPatchRes.status()).toBe(403)

    // 2. Admin CAN see legacy slot and edit it
    const adminPage = await browser.newPage()
    await loginThroughUi(adminPage, adminUser.email)
    await adminPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const adminListRes = await adminPage.request.get("/api/teacher/classes")
    const adminListData = await adminListRes.json()
    const isPresentForAdmin = (adminListData.classes || []).some((c: any) => c.id === legacySlot.id)
    expect(isPresentForAdmin).toBe(true)

    const adminPatchRes = await adminPage.request.patch(`/api/teacher/classes/${legacySlot.id}`, {
      data: { topic: `Admin Updated Legacy ${nonce}` },
    })
    expect(adminPatchRes.status()).toBe(200)
    await adminPage.close()
  })

  test("CRUD-06: LIVE slot cannot be edited or cancelled (API returns 400, UI disabled)", async ({ page }) => {
    const liveSlot = await prisma.demoSlot.create({
      data: {
        createdById: teacherA.id,
        courseId: course.id,
        topic: `Live Slot Active ${nonce}`,
        facultyName: "Teacher A",
        startTime: new Date(Date.now() - 10 * 60 * 1000), // started 10m ago
        durationMinutes: 60,
        agoraChannelName: `demo_live_${Date.now()}`,
        status: "LIVE",
      },
    })

    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})
    await mirrorCookies(page)

    // 1. In UI, switch to Live tab and verify Edit and Cancel buttons are disabled
    await page.goto("/teacher/classes", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="tab-live"]')).toBeVisible()
    await expect(page.locator('[data-testid="count-live"]')).toContainText("1")
    await page.locator('[data-testid="tab-live"]').click()
    const card = page.locator(`[data-testid="class-card-${liveSlot.id}"]`)
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.getByText("LIVE NOW")).toBeVisible()

    const editBtn = card.getByRole("button", { name: /Edit/i })
    await expect(editBtn).toBeDisabled()

    const cancelBtn = card.getByRole("button", { name: /Cancel/i })
    await expect(cancelBtn).toBeDisabled()

    // 2. API returns 400 on edit attempt
    const patchRes = await page.request.patch(`/api/teacher/classes/${liveSlot.id}`, {
      data: { topic: "Attempt to edit live" },
    })
    expect(patchRes.status()).toBe(400)
    const patchErr = await patchRes.json()
    expect(patchErr.error).toContain("LIVE")

    // 3. API returns 400 on cancel attempt
    const cancelRes = await page.request.delete(`/api/teacher/classes/${liveSlot.id}`)
    expect(cancelRes.status()).toBe(400)
  })

  test("CRUD-07: Class history tabs, counts, read-only cards, and student exclusion", async ({ page, browser }) => {
    // Clean up any slots created by teacherA in prior tests to have exact isolated tab counts
    await prisma.demoBooking.deleteMany({ where: { slot: { createdById: teacherA.id } } }).catch(() => {})
    await prisma.demoSlot.deleteMany({ where: { createdById: teacherA.id } }).catch(() => {})

    // 1. Fixture: Create slots for Teacher A in SCHEDULED, LIVE, ENDED, and CANCELLED
    const now = Date.now()
    const scheduledSlot = await prisma.demoSlot.create({
      data: {
        createdById: teacherA.id,
        courseId: course.id,
        topic: `Upcoming Hist Slot ${nonce}`,
        facultyName: "Teacher A",
        startTime: new Date(now + 24 * 60 * 60 * 1000),
        durationMinutes: 45,
        agoraChannelName: `demo_hist_sched_${Date.now()}`,
        status: "SCHEDULED",
      },
    })

    const liveSlot = await prisma.demoSlot.create({
      data: {
        createdById: teacherA.id,
        courseId: course.id,
        topic: `Live Hist Slot ${nonce}`,
        facultyName: "Teacher A",
        startTime: new Date(now - 15 * 60 * 1000),
        durationMinutes: 60,
        agoraChannelName: `demo_hist_live_${Date.now()}`,
        status: "LIVE",
      },
    })

    const endedSlot = await prisma.demoSlot.create({
      data: {
        createdById: teacherA.id,
        courseId: course.id,
        topic: `Ended Hist Slot ${nonce}`,
        facultyName: "Teacher A",
        startTime: new Date(now - 2 * 24 * 60 * 60 * 1000),
        durationMinutes: 50,
        agoraChannelName: `demo_hist_ended_${Date.now()}`,
        status: "ENDED",
        startedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        endedAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000),
      },
    })

    // Add bookings to ended slot to verify bookingsCount
    await prisma.demoBooking.create({
      data: {
        slotId: endedSlot.id,
        studentId: studentUser.id,
        courseId: course.id,
        mobile: "+919876543210",
        status: "BOOKED",
      },
    })

    const cancelledSlot = await prisma.demoSlot.create({
      data: {
        createdById: teacherA.id,
        courseId: course.id,
        topic: `Cancelled Hist Slot ${nonce}`,
        facultyName: "Teacher A",
        startTime: new Date(now + 48 * 60 * 60 * 1000),
        durationMinutes: 30,
        agoraChannelName: `demo_hist_canc_${Date.now()}`,
        status: "CANCELLED",
      },
    })

    // Create a legacy slot with createdById: null
    const legacyHistSlot = await prisma.demoSlot.create({
      data: {
        createdById: null,
        courseId: course.id,
        topic: `Legacy Hist Slot ${nonce}`,
        facultyName: "Legacy Faculty",
        startTime: new Date(now + 36 * 60 * 60 * 1000),
        durationMinutes: 60,
        agoraChannelName: `demo_hist_leg_${Date.now()}`,
        status: "SCHEDULED",
      },
    })

    // 2. Login as Teacher A and view My Classes
    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})
    await page.goto("/teacher/classes", { waitUntil: "domcontentloaded" })

    // Page loads, no alert error
    await expect(page.locator('[role="alert"]')).not.toBeVisible()

    // Tab counts match fixture
    await expect(page.locator('[data-testid="tab-upcoming"]')).toBeVisible()
    await expect(page.locator('[data-testid="count-upcoming"]')).toContainText("1")
    await expect(page.locator('[data-testid="count-live"]')).toContainText("1")
    await expect(page.locator('[data-testid="count-past"]')).toContainText("1")
    await expect(page.locator('[data-testid="count-cancelled"]')).toContainText("1")

    // Check Upcoming tab has Edit, Cancel, Copy Link
    const schedCard = page.locator(`[data-testid="class-card-${scheduledSlot.id}"]`)
    await expect(schedCard).toBeVisible()
    await expect(schedCard.getByRole("button", { name: /Copy Link/i })).toBeVisible()
    await expect(schedCard.getByRole("link", { name: /Edit/i })).toBeVisible()
    await expect(schedCard.getByRole("button", { name: /Cancel/i })).toBeVisible()

    // Switch to Past tab: read-only, displays bookingsCount, NO Edit/Cancel/Join
    await page.locator('[data-testid="tab-past"]').click()
    const endedCard = page.locator(`[data-testid="class-card-${endedSlot.id}"]`)
    await expect(endedCard).toBeVisible()
    await expect(endedCard.getByText("Completed", { exact: true })).toBeVisible()
    await expect(endedCard.locator(`[data-testid="booking-count-${endedSlot.id}"]`)).toContainText("1")
    await expect(endedCard.getByRole("button", { name: /Edit/i })).not.toBeVisible()
    await expect(endedCard.getByRole("link", { name: /Edit/i })).not.toBeVisible()
    await expect(endedCard.getByRole("button", { name: /Cancel/i })).not.toBeVisible()
    await expect(endedCard.getByRole("link", { name: /Join Live Demo/i })).not.toBeVisible()

    // Switch to Cancelled tab: read-only, NO Edit/Cancel/Join
    await page.locator('[data-testid="tab-cancelled"]').click()
    const cancCard = page.locator(`[data-testid="class-card-${cancelledSlot.id}"]`)
    await expect(cancCard).toBeVisible()
    await expect(cancCard.getByText("Cancelled", { exact: true })).toBeVisible()
    await expect(cancCard.getByRole("button", { name: /Edit/i })).not.toBeVisible()
    await expect(cancCard.getByRole("link", { name: /Edit/i })).not.toBeVisible()
    await expect(cancCard.getByRole("button", { name: /Cancel/i })).not.toBeVisible()
    await expect(cancCard.getByRole("link", { name: /Join Live Demo/i })).not.toBeVisible()

    // 3. API assertions: Teacher B does NOT see Teacher A's slots
    const teacherBPage = await browser.newPage()
    await loginThroughUi(teacherBPage, teacherB.email)
    await teacherBPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const teacherBListRes = await teacherBPage.request.get("/api/teacher/classes")
    const teacherBListData = await teacherBListRes.json()
    const teacherBIds = (teacherBListData.classes || []).map((c: any) => c.id)
    expect(teacherBIds).not.toContain(scheduledSlot.id)
    expect(teacherBIds).not.toContain(liveSlot.id)
    expect(teacherBIds).not.toContain(endedSlot.id)
    expect(teacherBIds).not.toContain(cancelledSlot.id)
    expect(teacherBIds).not.toContain(legacyHistSlot.id)
    await teacherBPage.close()

    // 4. API assertions: Admin sees all including legacyHistSlot
    const adminPage = await browser.newPage()
    await loginThroughUi(adminPage, adminUser.email)
    await adminPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const adminListRes = await adminPage.request.get("/api/teacher/classes")
    const adminListData = await adminListRes.json()
    const adminIds = (adminListData.classes || []).map((c: any) => c.id)
    expect(adminIds).toContain(scheduledSlot.id)
    expect(adminIds).toContain(liveSlot.id)
    expect(adminIds).toContain(endedSlot.id)
    expect(adminIds).toContain(cancelledSlot.id)
    expect(adminIds).toContain(legacyHistSlot.id)
    await adminPage.close()

    // Clean up created slots
    await prisma.demoBooking.deleteMany({ where: { slotId: endedSlot.id } }).catch(() => {})
    await prisma.demoSlot.deleteMany({
      where: {
        id: { in: [scheduledSlot.id, liveSlot.id, endedSlot.id, cancelledSlot.id, legacyHistSlot.id] },
      },
    }).catch(() => {})
  })
})
