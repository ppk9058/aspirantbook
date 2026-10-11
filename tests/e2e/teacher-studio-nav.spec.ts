import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, loginThroughUi, createActor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe("Teacher Studio Navigation, Allowlist & Super-Admin Route Protection", () => {
  test.setTimeout(90_000)

  let nonce: string
  let teacherUser: any
  let studentUser: any

  test.beforeAll(async () => {
    nonce = newNonce()
    teacherUser = await createActor(nonce, UserRole.TEACHER, "teacher-nav")
    studentUser = await createActor(nonce, UserRole.FREE, "student-nav")
  })

  test.afterAll(async () => {
    if (teacherUser?.id) {
      await prisma.user.deleteMany({ where: { id: { in: [teacherUser.id, studentUser?.id].filter(Boolean) } } }).catch(() => {})
    }
  })

  test("T-NAV-01: Teacher can open allowed studios from TEACHER_NAV without bouncing, with correct sidebar highlight", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    // Ensure session cookies exist for localhost as well
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

    // 1. Video Courses Studio
    const resCourses = await page.goto("/admin/courses", { waitUntil: "domcontentloaded" })
    expect(resCourses?.status()).toBe(200)
    await expect(page).toHaveURL(/.*\/admin\/courses/)
    expect(await page.locator("body").innerText()).not.toContain("Application error")
    // Sidebar highlight: exactly one nav link in AdminNav should be active (bg-purple-600)
    const activeAdminNavCourses = page.locator("aside nav a.bg-purple-600")
    expect(await activeAdminNavCourses.count()).toBe(1)
    await expect(activeAdminNavCourses).toHaveText(/Video Course Studio/)

    // 2. Tutorial Studio
    const resTutorials = await page.goto("/admin/tutorials", { waitUntil: "domcontentloaded" })
    expect(resTutorials?.status()).toBe(200)
    await expect(page).toHaveURL(/.*\/admin\/tutorials/)
    const activeAdminNavTutorials = page.locator("aside nav a.bg-purple-600")
    expect(await activeAdminNavTutorials.count()).toBe(1)
    await expect(activeAdminNavTutorials).toHaveText(/Tutorial Studio/)

    // 3. PYQ Studio
    const resPyqs = await page.goto("/admin/pyqs", { waitUntil: "domcontentloaded" })
    expect(resPyqs?.status()).toBe(200)
    await expect(page).toHaveURL(/.*\/admin\/pyqs/)
    const activeAdminNavPyqs = page.locator("aside nav a.bg-purple-600")
    expect(await activeAdminNavPyqs.count()).toBe(1)
    await expect(activeAdminNavPyqs).toHaveText(/PYQ Studio/)

    // 4. Batches & Prep
    const resBatches = await page.goto("/admin/batches", { waitUntil: "domcontentloaded" })
    expect(resBatches?.status()).toBe(200)
    await expect(page).toHaveURL(/.*\/admin\/batches/)
    const activeAdminNavBatches = page.locator("aside nav a.bg-purple-600")
    expect(await activeAdminNavBatches.count()).toBe(1)
    await expect(activeAdminNavBatches).toHaveText(/Batches & Prep/)

    // 5. Test Series Studio (/teacher/test-series)
    const resTestSeries = await page.goto("/teacher/test-series", { waitUntil: "domcontentloaded" })
    expect(resTestSeries?.status()).toBe(200)
    await expect(page).toHaveURL(/.*\/teacher\/test-series/)

    // 6. Teacher Dashboard (/teacher)
    const resTeacherDash = await page.goto("/teacher", { waitUntil: "domcontentloaded" })
    expect(resTeacherDash?.status()).toBe(200)
    await expect(page).toHaveURL(/.*\/teacher$/)
  })

  test("T-NAV-02: Teacher is strictly blocked from super-admin routes with 307 redirect to /teacher", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const blockedRoutes = [
      "/admin",
      "/admin/dashboard",
      "/admin/users",
      "/admin/audit",
      "/admin/settings",
      "/admin/analytics",
      "/admin/homepage-cards",
    ]

    for (const route of blockedRoutes) {
      const res = await page.request.get(route, { maxRedirects: 0 })
      expect(res.status()).toBe(307)
      const location = res.headers()["location"]
      expect(location).toMatch(/\/teacher$/)

      const body = await res.text()
      expect(body).not.toContain("Admin Authority")
      expect(body).not.toContain("Audit Logs")
      expect(body).not.toContain("User Management")
      expect(body).not.toContain("System Settings")
    }

    // Direct browser navigation redirects cleanly to /teacher
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/.*\/teacher/)
  })

  test("T-NAV-03: Student and guest are blocked from admin studio routes", async ({ page }) => {
    // 1. Guest (unauthenticated) -> redirects to /login
    const guestRes = await page.request.get("/admin/courses", { maxRedirects: 0 })
    expect(guestRes.status()).toBe(307)
    expect(guestRes.headers()["location"]).toMatch(/\/login$/)

    // 2. Student (logged-in) -> redirects to /
    await loginThroughUi(page, studentUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    for (const studioRoute of ["/admin/courses", "/admin/tutorials", "/admin/pyqs", "/admin/batches"]) {
      const stuRes = await page.request.get(studioRoute, { maxRedirects: 0 })
      expect(stuRes.status()).toBe(307)
      expect(stuRes.headers()["location"]).toMatch(/\/$/)
    }
  })
})
