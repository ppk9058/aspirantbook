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
  let adminUser: any
  let studentUser: any

  test.beforeAll(async () => {
    nonce = newNonce()
    teacherUser = await createActor(nonce, UserRole.TEACHER, "teacher-nav")
    adminUser = await createActor(nonce, UserRole.ADMIN, "admin-nav")
    studentUser = await createActor(nonce, UserRole.FREE, "student-nav")
  })

  test.afterAll(async () => {
    const userIds = [teacherUser?.id, adminUser?.id, studentUser?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
  })

  test("T-NAV-01: Teacher opens each TEACHER_NAV studio: URL is /teacher/<studio>, page renders cleanly, exactly one active sidebar item", async ({ page }) => {
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

    const studios = [
      { name: "Video Courses Studio", href: "/teacher/courses", label: /Video Course/ },
      { name: "Test Series Studio", href: "/teacher/test-series", label: /Test Series/ },
      { name: "PYQ Studio", href: "/teacher/pyqs", label: /PYQ/ },
      { name: "Tutorial Studio", href: "/teacher/tutorials", label: /Tutorial/ },
      { name: "Batches & Prep", href: "/teacher/batches", label: /Batches/ },
    ]

    for (const studio of studios) {
      const res = await page.goto(studio.href, { waitUntil: "domcontentloaded" })
      expect(res?.status()).toBe(200)
      await expect(page).toHaveURL(new RegExp(studio.href))
      const bodyText = await page.locator("body").innerText()
      expect(bodyText).not.toContain("Application error")

      // LeftSidebar highlight: exactly one nav link in LeftSidebar should be active (bg-[#3AAFA9])
      const activeNavItems = page.locator("aside nav a.bg-\\[\\#1448d8\\]")
      expect(await activeNavItems.count()).toBe(1)
      await expect(activeNavItems).toContainText(studio.label)
    }

    // Teacher Dashboard (/teacher) also has exactly one active nav item
    const resTeacherDash = await page.goto("/teacher", { waitUntil: "domcontentloaded" })
    expect(resTeacherDash?.status()).toBe(200)
    await expect(page).toHaveURL(/.*\/teacher$/)
    const activeDashNav = page.locator("aside nav a.bg-\\[\\#1448d8\\]")
    expect(await activeDashNav.count()).toBe(1)
    await expect(activeDashNav).toContainText(/Teacher Dashboard/)
  })

  test("T-NAV-02: Old /admin/<studio> routes strictly redirect teacher to /teacher/<studio>", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const oldStudios = [
      { oldUrl: "/admin/courses", expectedUrl: "/teacher/courses" },
      { oldUrl: "/admin/tutorials", expectedUrl: "/teacher/tutorials" },
      { oldUrl: "/admin/pyqs", expectedUrl: "/teacher/pyqs" },
      { oldUrl: "/admin/batches", expectedUrl: "/teacher/batches" },
    ]

    for (const item of oldStudios) {
      // 1. Direct HTTP request returns 307 redirect
      const res = await page.request.get(item.oldUrl, { maxRedirects: 0 })
      expect(res.status()).toBe(307)
      const location = res.headers()["location"]
      expect(location).toMatch(new RegExp(`${item.expectedUrl}$`))

      // 2. Direct browser navigation lands cleanly on /teacher/<studio>
      await page.goto(item.oldUrl)
      await expect(page).toHaveURL(new RegExp(`${item.expectedUrl}`))
      const bodyText = await page.locator("body").innerText()
      expect(bodyText).not.toContain("Application error")
    }
  })

  test("T-NAV-03: Teacher is strictly blocked from super-admin routes with 307 redirect to /teacher", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const blockedRoutes = [
      "/admin",
      "/admin/dashboard",
      "/admin/users",
      "/admin/audit",
      "/admin/settings",
      "/admin/books",
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

  test("T-NAV-04: Admin still opens /admin/pyqs directly without redirect", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const res = await page.goto("/admin/pyqs", { waitUntil: "domcontentloaded" })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveURL(/.*\/admin\/pyqs/)
    expect(await page.locator("body").innerText()).not.toContain("Application error")

    // AdminNav is rendered with active item
    const activeAdminNav = page.locator("aside nav a.bg-purple-600")
    expect(await activeAdminNav.count()).toBe(1)
    await expect(activeAdminNav).toHaveText(/PYQ Studio/)
  })

  test("T-NAV-05: Student and guest are blocked from admin and teacher studio routes", async ({ page }) => {
    // 1. Guest (unauthenticated) -> redirects to /login
    const guestRes = await page.request.get("/admin/courses", { maxRedirects: 0 })
    expect(guestRes.status()).toBe(307)
    expect(guestRes.headers()["location"]).toMatch(/\/login$/)

    const guestTeacherRes = await page.request.get("/teacher/courses", { maxRedirects: 0 })
    expect(guestTeacherRes.status()).toBe(307)
    expect(guestTeacherRes.headers()["location"]).toMatch(/\/login$/)

    // 2. Student (logged-in) -> redirects to /
    await loginThroughUi(page, studentUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    for (const studioRoute of ["/admin/courses", "/admin/tutorials", "/admin/pyqs", "/admin/batches", "/teacher/courses", "/teacher/pyqs"]) {
      const stuRes = await page.request.get(studioRoute, { maxRedirects: 0 })
      expect(stuRes.status()).toBe(307)
      expect(stuRes.headers()["location"]).toMatch(/\/$/)
    }
  })
})
