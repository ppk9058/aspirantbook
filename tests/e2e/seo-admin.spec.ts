import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("SEO Admin Dashboard Authorization & Verification", () => {
  test("Guarded: ADMIN allowed; TEACHER / logged-out blocked on /admin/seo", async ({ browser }) => {
    // 1. Logged-out user -> Redirected to /login
    const anonContext = await browser.newContext()
    const anonPage = await anonContext.newPage()
    await anonPage.goto(`${BASE_URL}/admin/seo`)
    expect(anonPage.url()).toContain("/login")
    await anonContext.close()

    // 2. TEACHER user -> Redirected to /teacher
    const teacherContext = await browser.newContext()
    await teacherContext.addCookies([
      { name: "ts_demo_role", value: "TEACHER", domain: "127.0.0.1", path: "/" },
    ])
    const teacherPage = await teacherContext.newPage()
    await teacherPage.goto(`${BASE_URL}/admin/seo`)
    expect(teacherPage.url()).toContain("/teacher")
    await teacherContext.close()

    // 3. ADMIN user -> Allowed access and renders dashboard
    const adminContext = await browser.newContext()
    await adminContext.addCookies([
      { name: "ts_demo_role", value: "ADMIN", domain: "127.0.0.1", path: "/" },
    ])
    const adminPage = await adminContext.newPage()
    await adminPage.goto(`${BASE_URL}/admin/seo`)
    expect(adminPage.url()).toContain("/admin/seo")
    await expect(adminPage.locator("h1")).toContainText("SEO Health & Audit Dashboard")
    await expect(adminPage.locator("text=Total Indexed Pages")).toBeVisible()
    await adminContext.close()
  })
})
