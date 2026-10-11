import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, loginThroughUi, createActor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe("Live Studio & Mock Classroom Removal Verification", () => {
  test.setTimeout(90_000)

  let nonce: string
  let teacherUser: any
  let studentUser: any
  let adminUser: any

  test.beforeAll(async () => {
    nonce = newNonce()
    teacherUser = await createActor(nonce, UserRole.TEACHER, "teacher-live-audit")
    studentUser = await createActor(nonce, UserRole.FREE, "student-live-audit")
    adminUser = await createActor(nonce, UserRole.ADMIN, "admin-live-audit")
  })

  test.afterAll(async () => {
    const ids = [teacherUser?.id, studentUser?.id, adminUser?.id].filter(Boolean)
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {})
    }
  })

  test("LSR-01a: Guest requests to removed classroom routes return 404", async ({ page }) => {
    const resPage = await page.request.get("/classroom/half-yearly-6")
    expect(resPage.status()).toBe(404)

    const resApi = await page.request.get("/api/classroom/live-status")
    expect(resApi.status()).toBe(404)

    const resUpsc = await page.request.get("/classroom/upsc-foundation")
    expect(resUpsc.status()).toBe(404)
  })

  test("LSR-01b: Student session requests to removed classroom routes return 404", async ({ page }) => {
    await loginThroughUi(page, studentUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const resPage = await page.request.get("/classroom/half-yearly-6")
    expect(resPage.status()).toBe(404)

    const resApi = await page.request.get("/api/classroom/live-status")
    expect(resApi.status()).toBe(404)
  })

  test("LSR-01c: Teacher session requests to removed classroom routes return 404", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const resPage = await page.request.get("/classroom/half-yearly-6")
    expect(resPage.status()).toBe(404)

    const resApi = await page.request.get("/api/classroom/live-status")
    expect(resApi.status()).toBe(404)
  })

  test("LSR-01d: Admin session requests to removed classroom routes return 404", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const resPage = await page.request.get("/classroom/half-yearly-6")
    expect(resPage.status()).toBe(404)

    const resApi = await page.request.get("/api/classroom/live-status")
    expect(resApi.status()).toBe(404)
  })

  test("LSR-02a: Teacher sidebar and dashboard contain no Live Studio links", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    await page.goto("/teacher")
    expect(await page.locator("body").innerText()).not.toContain("Live Studio")
    expect(await page.locator("body").innerText()).not.toContain("Launch Live Studio")
    await expect(page.locator("a[href*='/classroom']")).toHaveCount(0)

    // Check teacher classes page has no hardcoded half-yearly-6
    await page.goto("/teacher/classes")
    expect(await page.locator("body").innerText()).not.toContain("half-yearly-6")
    await expect(page.locator("a[href*='/classroom']")).toHaveCount(0)
  })

  test("LSR-02b: Student dashboard and sidebar contain no Live Studio or Live Classroom links", async ({ page }) => {
    await loginThroughUi(page, studentUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    await page.goto("/dashboard")
    expect(await page.locator("body").innerText()).not.toContain("Live Studio")
    expect(await page.locator("body").innerText()).not.toContain("Live Classroom")
    await expect(page.locator("a[href*='/classroom']")).toHaveCount(0)
    await expect(page.locator("aside nav").getByText("Live Classes", { exact: true })).toHaveCount(0)
    await expect(page.locator("aside nav").getByText("Live Studio", { exact: true })).toHaveCount(0)
  })

  test("LSR-02c: Admin nav contains no Live Studio links", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    await page.goto("/admin/dashboard")
    await expect(page.locator("aside nav").getByText("Live Studio", { exact: true })).toHaveCount(0)
    await expect(page.locator("a[href*='/classroom']")).toHaveCount(0)
  })

  test("LSR-03: Teacher and Student dashboards and studios render with 200 OK and no 500 error", async ({ page }) => {
    // Student Dashboard
    await loginThroughUi(page, studentUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const resStudentDash = await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
    expect(resStudentDash?.status()).toBe(200)
    expect(await page.locator("body").innerText()).not.toContain("Application error")

    // Clear session and test teacher
    await page.context().clearCookies()
    await loginThroughUi(page, teacherUser.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    const resTeacherDash = await page.goto("/teacher", { waitUntil: "domcontentloaded" })
    expect(resTeacherDash?.status()).toBe(200)
    expect(await page.locator("body").innerText()).not.toContain("Application error")

    const resTeacherClasses = await page.goto("/teacher/classes", { waitUntil: "domcontentloaded" })
    expect(resTeacherClasses?.status()).toBe(200)
    expect(await page.locator("body").innerText()).not.toContain("Application error")

    const resTeacherTests = await page.goto("/teacher/test-series", { waitUntil: "domcontentloaded" })
    expect(resTeacherTests?.status()).toBe(200)
    expect(await page.locator("body").innerText()).not.toContain("Application error")
  })
})
