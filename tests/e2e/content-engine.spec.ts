import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import {
  prisma,
  PASSWORD,
  newNonce,
  createActor,
  loginAs,
} from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Exam Content Engine E2E Acceptance Suite", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let teacherUser: any
  let studentUser: any

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "ce-admin")
    teacherUser = await createActor(nonce, UserRole.TEACHER, "ce-teacher")
    studentUser = await createActor(nonce, UserRole.STUDENT, "ce-student")
  })

  test.afterAll(async () => {
    // Teardown created actors
    await prisma.user.deleteMany({
      where: { email: { in: [adminUser.email, teacherUser.email, studentUser.email] } },
    }).catch(() => {})
  })

  test("1. RBAC & Security: API endpoints enforce Admin-only authority", async ({ request }) => {
    // A) Unauthenticated request -> must be rejected (401 or redirected)
    const unauthRes = await request.post(`${BASE_URL}/api/admin/content-engine/batch`, {
      data: { pastedText: "Q1. Test question?" },
    })
    expect([401, 403, 307, 302]).toContain(unauthRes.status())

    // B) Teacher request -> must be rejected (403 Forbidden)
    const teacherRes = await request.post(`${BASE_URL}/api/admin/content-engine/batch`, {
      headers: {
        Cookie: `ts_demo_role=TEACHER`,
      },
      data: { pastedText: "Q1. Test question?" },
    })
    expect([401, 403]).toContain(teacherRes.status())

    // C) Admin request -> authorized
    const uniqueBatch = `[UPSC CSE 2023] Q1. E2E Test question ${Date.now()}-${Math.random().toString(36).slice(2, 6)}:
(a) Option A
(b) Option B
(c) Option C
(d) Option D
Ans: (c)
Explanation: Detailed explanation of more than eighty characters for passing quality gates verification.`

    const adminRes = await request.post(`${BASE_URL}/api/admin/content-engine/batch`, {
      headers: {
        Cookie: `ts_demo_role=ADMIN`,
      },
      data: {
        pastedText: uniqueBatch,
      },
    })
    expect(adminRes.status()).toBe(201)
    const body = await adminRes.json()
    expect(body.success).toBe(true)
    expect(body.addedCount + body.duplicateCount).toBeGreaterThanOrEqual(1)
  })

  test("2. Admin Navigation & Library Dashboard", async ({ page }) => {
    // Use ts_demo_role=ADMIN for reliable session
    await page.context().addCookies([
      {
        name: "ts_demo_role",
        value: "ADMIN",
        domain: "127.0.0.1",
        path: "/",
      },
    ])

    await page.goto(`${BASE_URL}/admin/content-engine`)
    await page.waitForLoadState("domcontentloaded")

    // Expect Content Engine header
    await expect(page.locator("h1")).toContainText("Content Engine")

    // Expect stats cards to be rendered
    await expect(page.locator("text=Total Questions").first()).toBeVisible()
    await expect(page.locator("span").filter({ hasText: /^Published$/ }).first()).toBeVisible()
    await expect(page.locator("text=Hindi Translated").first()).toBeVisible()
  })

  test("3. Add Batch & Quality Gates Wave Publishing", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "ts_demo_role",
        value: "ADMIN",
        domain: "127.0.0.1",
        path: "/",
      },
    ])

    // Navigate to Add Batch
    await page.goto(`${BASE_URL}/admin/content-engine/add`)
    await page.waitForLoadState("domcontentloaded")

    // Click sample loader
    await page.click("text=Load 4-Q Sample")
    // Submit batch
    await page.click("button:has-text('Parse & Save Batch')")

    // Expect response badge or toast
    await expect(
      page.locator("text=Batch parsed!").or(page.locator("text=Added:")).first()
    ).toBeVisible({
      timeout: 15_000,
    })

    // Navigate to Quality Gates
    await page.goto(`${BASE_URL}/admin/content-engine/gates`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.locator("h1")).toContainText("Quality Gates")
    await expect(page.locator("text=Total Checked")).toBeVisible()

    // Trigger wave publishing if publish button is enabled
    const publishBtn = page.locator("button:has-text('Publish Wave')")
    if (await publishBtn.isEnabled()) {
      await publishBtn.click()
      await expect(
        page.locator("text=Last Wave Result:").or(page.locator("text=Live")).first()
      ).toBeVisible({
        timeout: 15_000,
      })
    }
  })

  test("4. Public SEO Routes: unauthenticated student & crawler access", async ({ browser }) => {
    // Create completely isolated, unauthenticated context
    const context = await browser.newContext()
    const studentPage = await context.newPage()

    // Home Hub
    const homeRes = await studentPage.goto(`${BASE_URL}/question-answer`)
    expect(homeRes?.status()).toBe(200)
    await expect(studentPage.locator("h1")).toContainText("Previous Year Exam Questions")

    // Language switch link exists (uniquely targets header toggle button)
    const langLink = studentPage.getByRole("link", { name: "हिन्दी", exact: true })
    await expect(langLink).toBeVisible()

    // Hindi Hub
    const hiRes = await studentPage.goto(`${BASE_URL}/hi/question-answer`)
    expect(hiRes?.status()).toBe(200)
    await expect(studentPage.locator("h1")).toContainText("पिछले वर्षों के परीक्षा प्रश्नोत्तर")

    // Robots.txt includes both sitemaps
    const robotsRes = await studentPage.goto(`${BASE_URL}/robots.txt`)
    expect(robotsRes?.status()).toBe(200)
    const robotsText = await studentPage.content()
    expect(robotsText).toContain("/question-answer/sitemap.xml")
    expect(robotsText).toContain("/hi/question-answer/sitemap.xml")

    // Sitemaps serve XML
    const sitemapRes = await studentPage.goto(`${BASE_URL}/question-answer/sitemap.xml`)
    expect(sitemapRes?.status()).toBe(200)
    const xml = await studentPage.content()
    expect(xml).toContain("urlset")

    // 404 on nonexistent question
    const missingRes = await studentPage.goto(
      `${BASE_URL}/question-answer/upsc-cse/history/q-nonexistent-slug-12345`
    )
    expect(missingRes?.status()).toBe(404)

    await context.close()
  })

  test("5. Static ZIP Export API: delivers valid ZIP package", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/content-engine/export`, {
      headers: {
        Cookie: `ts_demo_role=ADMIN`,
      },
    })
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toBe("application/zip")
    expect(res.headers()["content-disposition"]).toContain("content-engine-static-site.zip")

    const body = await res.body()
    expect(body.length).toBeGreaterThan(100)
    // Check ZIP magic header PK\x03\x04
    expect(body[0]).toBe(0x50)
    expect(body[1]).toBe(0x4b)
    expect(body[2]).toBe(0x03)
    expect(body[3]).toBe(0x04)
  })
})
