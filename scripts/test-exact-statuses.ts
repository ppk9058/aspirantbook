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
  console.log("=== ITEM F: EXACT HTTP STATUSES ===")
  const browser = await chromium.launch({ headless: true })

  const sPub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-pub" },
    include: { tests: true },
  })
  const sUnpub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-unpub" },
    include: { tests: true },
  })

  const draftTest = sPub!.tests.find((t) => !t.isPublished)!

  const roles = ["GUEST", "STUDENT"]
  const results: any[] = []

  for (const role of roles) {
    const context = await browser.newContext()
    const page = await context.newPage()

    if (role === "STUDENT") {
      await login(page, "student_test@example.com")
    }

    // 1. Direct URL of S-UNPUB
    const unpubUrl = `${BASE_URL}/test-series/${sUnpub!.slug}`
    const unpubRes = await page.goto(unpubUrl, { waitUntil: "networkidle" })
    const unpubStatus = unpubRes?.status()
    const unpubBody = await page.content()
    const unpubShowsNotFound = unpubBody.includes("Series Not Found") || unpubBody.includes("not found") || unpubBody.includes("404")

    // 2. Direct URL of draft test in series detail view
    const draftViewUrl = `${BASE_URL}/test-series/${sPub!.slug}?testId=${draftTest.id}`
    const draftViewRes = await page.goto(draftViewUrl, { waitUntil: "networkidle" })
    const draftViewStatus = draftViewRes?.status()
    const draftViewBody = await page.content()
    // Does it display the draft test?
    const draftTestShownInView = draftViewBody.includes("PB-7391 S-PUB Mock 2 (Draft)")

    // 3. Direct URL of draft test attempt
    const draftAttUrl = `${BASE_URL}/test-series/${sPub!.slug}/attempt?testId=${draftTest.id}`
    const draftAttRes = await page.goto(draftAttUrl, { waitUntil: "networkidle" })
    const draftAttStatus = draftAttRes?.status()
    const draftAttBody = await page.content()
    const draftAttBlocked = draftAttBody.includes("Test is not published yet") || draftAttBody.includes("404") || draftAttBody.includes("Login") || !draftAttBody.includes("PB-7391 S-PUB-T2-DRAFT")

    results.push({
      role,
      unpubStatus,
      unpubShowsNotFound,
      draftViewStatus,
      draftTestShownInView,
      draftAttStatus,
      draftAttBlocked,
    })

    await context.close()
  }

  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}

main().catch(console.error).finally(() => process.exit(0))
