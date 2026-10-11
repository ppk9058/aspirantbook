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

test.describe("Teacher Class Schedule E2E", () => {
  test.setTimeout(90_000)

  let nonce: string
  let teacherUser: any
  let studentUser: any
  let course: any

  test.beforeAll(async () => {
    nonce = newNonce()
    teacherUser = await createActor(nonce, UserRole.TEACHER, "teacher-sched")
    studentUser = await createActor(nonce, UserRole.FREE, "student-sched")
    course = await prisma.course.create({
      data: {
        title: `Course-${nonce}`,
        slug: `course-${slugFor(nonce)}`,
        description: "Test Published Course for Demo Scheduling",
        difficulty: "BEGINNER",
        isPublished: true,
        status: "PUBLISHED",
      },
    })
  })

  test.afterAll(async () => {
    if (course?.id) {
      await prisma.demoSlot.deleteMany({ where: { courseId: course.id } }).catch(() => {})
      await prisma.course.deleteMany({ where: { id: course.id } }).catch(() => {})
    }
    if (teacherUser?.id || studentUser?.id) {
      await prisma.user.deleteMany({
        where: { id: { in: [teacherUser?.id, studentUser?.id].filter(Boolean) } },
      }).catch(() => {})
    }
  })

  test("T-SCHED-01: Teacher schedules a class: success message appears, DemoSlot row exists in DB with correct values, and appears on My Classes", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    // Ensure session cookies for localhost
    const cookies = await page.context().cookies()
    const localhostCookies = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    }))
    await page.context().addCookies(localhostCookies)

    await page.goto("/teacher/classes/new", { waitUntil: "domcontentloaded" })
    await expect(page.locator("h1")).toContainText("Schedule a New Teaching Session")

    // Wait for the course dropdown to populate with our published course
    const courseSelect = page.locator('select[name="courseId"]')
    await expect(courseSelect).toBeVisible()
    await expect(page.locator(`select[name="courseId"] option[value="${course.id}"]`)).toBeAttached({ timeout: 15_000 })

    const topicTitle = `Quantum Optics ${nonce}`
    const targetDate = "2028-11-20"
    const targetTime = "15:30"
    const expectedUtc = istToUtcIso(targetDate, targetTime)

    await page.fill('input[name="topic"]', topicTitle)
    await page.selectOption('select[name="courseId"]', course.id)
    await page.fill('input[name="date"]', targetDate)
    await page.fill('input[name="time"]', targetTime)
    await page.selectOption('select[name="duration"]', "60")

    await page.getByRole("button", { name: /Confirm Schedule/i }).click()

    // Success message appears
    await expect(page.getByText(/Class scheduled successfully!|Lecture & Demo Slot Scheduled!/i).first()).toBeVisible({ timeout: 15_000 })

    // DemoSlot row exists in DB with the exact courseId, topic, and start time UTC
    const slot = await prisma.demoSlot.findFirst({
      where: { topic: topicTitle },
    })
    expect(slot).not.toBeNull()
    expect(slot!.courseId).toBe(course.id)
    expect(slot!.topic).toBe(topicTitle)
    expect(slot!.startTime.toISOString()).toBe(expectedUtc)

    // Navigate to My Classes
    await page.getByRole("link", { name: /Go to My Classes/i }).click()
    await page.waitForURL("**/teacher/classes", { timeout: 15_000 })
    await expect(page).toHaveURL(/.*\/teacher\/classes/)
    await expect(page.getByText(topicTitle)).toBeVisible({ timeout: 15_000 })
  })

  test("T-SCHED-02: Missing required field shows visible validation error, and forced 400 shows server error text", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const cookies = await page.context().cookies()
    const localhostCookies = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    }))
    await page.context().addCookies(localhostCookies)

    await page.goto("/teacher/classes/new", { waitUntil: "domcontentloaded" })
    await expect(page.locator("h1")).toContainText("Schedule a New Teaching Session")

    // Wait for hydration and courses to load
    await expect(page.locator(`select[name="courseId"] option[value="${course.id}"]`)).toBeAttached({ timeout: 15_000 })

    // Missing field validation
    await page.getByRole("button", { name: /Confirm Schedule/i }).click()
    await expect(page.getByText(/Class topic is required|Please select a course/i).first()).toBeVisible({ timeout: 10_000 })

    // Past date validation
    await page.fill('input[name="topic"]', "Past Lecture")
    await page.selectOption('select[name="courseId"]', course.id)
    await page.fill('input[name="date"]', "2020-01-01")
    await page.fill('input[name="time"]', "10:00")
    await page.getByRole("button", { name: /Confirm Schedule/i }).click()
    await expect(page.getByText(/Start time must be in the future/i).first()).toBeVisible()

    // Forced 400 test: route mock returns 400 with specific server error text
    await page.route("**/api/teacher/classes", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Server validation failed: simulated bad request" }),
        })
      } else {
        await route.continue()
      }
    })

    await page.fill('input[name="topic"]', "Valid Future Lecture")
    await page.fill('input[name="date"]', "2028-11-20")
    await page.fill('input[name="time"]', "15:30")
    await page.getByRole("button", { name: /Confirm Schedule/i }).click()

    await expect(page.getByText("Server validation failed: simulated bad request")).toBeVisible({ timeout: 10_000 })

    await page.unroute("**/api/teacher/classes")
  })

  test("T-SCHED-03: Student and guest cannot POST to /api/teacher/classes (401/403)", async ({ page, browser }) => {
    // 1. Guest request (no auth cookies) -> 401
    const guestContext = await browser.newContext()
    const guestRes = await guestContext.request.post("http://127.0.0.1:3045/api/teacher/classes", {
      data: {
        topic: "Guest Attempt",
        courseId: course.id,
        startTimeUtc: "2028-11-20T10:00:00.000Z",
      },
    })
    expect(guestRes.status()).toBe(401)
    await guestContext.close()

    // 2. Student request (authenticated as student) -> 403
    const studentPage = await browser.newPage()
    await loginThroughUi(studentPage, studentUser.email)
    await studentPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const studentRes = await studentPage.request.post("/api/teacher/classes", {
      data: {
        topic: "Student Attempt",
        courseId: course.id,
        startTimeUtc: "2028-11-20T10:00:00.000Z",
      },
    })
    expect(studentRes.status()).toBe(403)
    await studentPage.close()
  })
})
