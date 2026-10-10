import { chromium } from "playwright"
import { prisma } from "../lib/prisma"
import path from "path"

const BASE_URL = "http://localhost:3045"
const SHOTS_DIR = path.resolve(process.cwd(), "logs/verify-studio/shots")

async function login(page: any, email: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await page.fill('input#email', email)
  await page.fill('input#password', "password123")
  await page.click('button[data-testid="login-submit"]')
  await page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 15000 })
  await page.waitForTimeout(1000)
}

async function main() {
  console.log("=== ITEM H: STAT CARDS VERIFICATION ===")
  const browser = await chromium.launch({ headless: true })
  const teacher = await prisma.user.findUnique({ where: { email: "teacher_owner@test.local" } })

  // Case 1: Seeded data with at least 1 student attempt
  const sPub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-pub" },
    include: { tests: { where: { isPublished: true } } },
  })
  const student = await prisma.user.findUnique({ where: { email: "student_test@example.com" } })

  // Clean and add 1 student attempt
  await prisma.examAttempt.deleteMany({
    where: { test: { createdById: teacher!.id } },
  })
  await prisma.examAttempt.create({
    data: {
      userId: student!.id,
      testId: sPub!.tests[0].id,
      status: "SUBMITTED",
      score: 7,
      totalMarks: 10,
      submittedAt: new Date(),
    },
  })

  // DB queries for Case 1
  const dbTests1 = await prisma.examTest.count({ where: { createdById: teacher!.id } })
  const dbPublished1 = await prisma.examTest.count({ where: { createdById: teacher!.id, isPublished: true } })
  const dbAttempts1 = await prisma.examAttempt.count({
    where: {
      test: { createdById: teacher!.id },
      user: { role: { notIn: ["TEACHER", "ADMIN"] } },
    },
  })

  const context1 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page1 = await context1.newPage()
  await login(page1, "teacher_owner@test.local")
  await page1.evaluate(() => localStorage.clear())
  await page1.goto(`${BASE_URL}/teacher/test-series`, { waitUntil: "networkidle" })
  await page1.waitForTimeout(1500)

  const shotCase1 = path.join(SHOTS_DIR, "teacher_stat_cards_seeded.png")
  await page1.screenshot({ path: shotCase1 })

  console.log("--- CASE 1 (Seeded Data with Attempts) ---")
  console.log(`DB Counts: Tests = ${dbTests1}, Published = ${dbPublished1}, Attempts = ${dbAttempts1}`)
  const body1 = await page1.content()
  console.log("UI Contains Total Tests (" + dbTests1 + "):", body1.includes(String(dbTests1)))
  console.log("UI Contains Published Tests (" + dbPublished1 + "):", body1.includes(String(dbPublished1)))
  console.log("UI Contains Total Submissions (" + dbAttempts1 + "):", body1.includes(String(dbAttempts1)))
  console.log("UI Contains Avg Class Score '7 pts':", body1.includes("7 pts"))
  console.log("UI Contains Avg Class Score '—':", body1.includes("—"))
  await context1.close()

  // Case 2: Zero-attempt case
  await prisma.examAttempt.deleteMany({})

  // DB queries for Case 2
  const dbTests2 = await prisma.examTest.count({
    where: {
      OR: [{ isPublished: true }, { createdById: teacher!.id }],
    },
  })
  const dbPublished2 = await prisma.examTest.count({
    where: { isPublished: true },
  })
  const dbAttempts2 = await prisma.examAttempt.count({})

  const context2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page2 = await context2.newPage()
  await login(page2, "teacher_owner@test.local")
  await page2.evaluate(() => localStorage.clear())
  await page2.goto(`${BASE_URL}/teacher/test-series`, { waitUntil: "networkidle" })
  await page2.waitForTimeout(1500)

  const shotCase2 = path.join(SHOTS_DIR, "teacher_stat_cards_zero_attempts.png")
  await page2.screenshot({ path: shotCase2 })

  console.log("\n--- CASE 2 (Zero Attempts Case) ---")
  console.log(`DB Counts: Tests = ${dbTests2}, Published = ${dbPublished2}, Attempts = ${dbAttempts2}`)
  const body2 = await page2.content()
  console.log("UI Contains Total Tests (" + dbTests2 + "):", body2.includes(String(dbTests2)))
  console.log("UI Contains Published Tests (" + dbPublished2 + "):", body2.includes(String(dbPublished2)))
  console.log("UI Contains Total Submissions (0):", body2.includes(">0<") || body2.includes("0</span>"))
  console.log("UI Contains Avg Class Score '—':", body2.includes("—"))
  console.log("UI Contains 'No submissions yet':", body2.includes("No submissions yet"))
  await context2.close()

  await browser.close()
}

main().catch(console.error).finally(() => process.exit(0))
