import { chromium } from "playwright"
import { prisma } from "../lib/prisma"

const BASE_URL = "http://localhost:3045"

async function login(page: any, email: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await page.fill('input#email', email)
  await page.fill('input#password', "password123")
  await page.click('button[data-testid="login-submit"]')
  await page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 15000 })
  await page.waitForTimeout(1000)
}

async function main() {
  console.log("=== VERIFYING REAL HTTP STATUS CODES ON DIRECT URLS ===")
  const sPub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-pub" },
    include: { tests: true },
  })
  const sUnpub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-unpub" },
    include: { tests: true },
  })

  const draftTest = sPub!.tests.find((t) => !t.isPublished)!
  console.log("S-PUB slug:", sPub!.slug)
  console.log("S-UNPUB slug:", sUnpub!.slug)
  console.log("Draft test id:", draftTest.id)

  const browser = await chromium.launch({ headless: true })

  const matrix = [
    { role: "GUEST", email: null },
    { role: "STUDENT", email: "student_test@example.com" },
    { role: "TEACHER", email: "teacher_owner@test.local" },
    { role: "ADMIN", email: "admin_test@example.com" },
  ]

  const results: any[] = []

  for (const item of matrix) {
    const context = await browser.newContext()
    const page = await context.newPage()

    if (item.email) {
      await login(page, item.email)
    }

    // 1. S-UNPUB direct URL
    const unpubUrl = `${BASE_URL}/test-series/${sUnpub!.slug}`
    const res1 = await page.goto(unpubUrl)
    const status1 = res1?.status()

    // 2. Draft test view URL (?testId=...)
    const draftViewUrl = `${BASE_URL}/test-series/${sPub!.slug}?testId=${draftTest.id}`
    const res2 = await page.goto(draftViewUrl)
    const status2 = res2?.status()

    // 3. Draft test attempt URL (/attempt?testId=...)
    const draftAttemptUrl = `${BASE_URL}/test-series/${sPub!.slug}/attempt?testId=${draftTest.id}`
    const res3 = await page.goto(draftAttemptUrl)
    const status3 = res3?.status()

    results.push({
      role: item.role,
      "S-UNPUB Direct": status1,
      "Draft Test View": status2,
      "Draft Test Attempt": status3,
    })

    await context.close()
  }

  await browser.close()

  console.log("\n--- RESULT TABLE ---")
  console.table(results)
}

main().catch(console.error).finally(() => process.exit(0))
