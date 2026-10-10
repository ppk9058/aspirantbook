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
  console.log("=== ITEM D: FALLBACK LOOKUP PROOF ===")
  const browser = await chromium.launch({ headless: true })

  // Find seeded series and tests
  const sPub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-pub" },
    include: { tests: true },
  })
  const sUnpub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-unpub" },
    include: { tests: true },
  })

  if (!sPub || !sUnpub) {
    throw new Error("Seeded test series not found in DB!")
  }

  const pubTest = sPub.tests.find((t) => t.isPublished)!
  const draftTest = sPub.tests.find((t) => !t.isPublished)!
  const unpubTest = sUnpub.tests[0]

  console.log("S-PUB slug:", sPub.slug, "Published test:", pubTest.id, "Draft test:", draftTest.id)
  console.log("S-UNPUB slug:", sUnpub.slug, "Unpub series test:", unpubTest.id)

  // 1. STUDENT requests
  console.log("\n--- 1. Testing as STUDENT (student_test@example.com) ---")
  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  await login(studentPage, "student_test@example.com")

  // Fallback lookup using S-UNPUB slug
  const stuUnpubRes = await studentPage.request.post(`${BASE_URL}/api/exam/attempt/start`, {
    data: { testId: sUnpub.slug, language: "English" },
  })
  console.log(`[STUDENT -> S-UNPUB slug (${sUnpub.slug})] HTTP Status:`, stuUnpubRes.status())
  const stuUnpubJson = await stuUnpubRes.json()
  console.log("Response Body:", JSON.stringify(stuUnpubJson, null, 2))

  // Fallback lookup using S-PUB slug
  const stuPubRes = await studentPage.request.post(`${BASE_URL}/api/exam/attempt/start`, {
    data: { testId: sPub.slug, language: "English" },
  })
  console.log(`\n[STUDENT -> S-PUB slug (${sPub.slug})] HTTP Status:`, stuPubRes.status())
  const stuPubJson = await stuPubRes.json()
  console.log("Response Body:", JSON.stringify({
    status: stuPubRes.status(),
    attemptId: stuPubJson?.data?.attemptId,
    testId: stuPubJson?.data?.testId,
    testTitle: stuPubJson?.data?.test?.title,
    questionsCount: stuPubJson?.data?.test?.sections?.reduce((acc: number, s: any) => acc + s.questions.length, 0),
  }, null, 2))
  console.log("Opened test title:", stuPubJson?.data?.test?.title)
  console.log("Is draft test opened?", stuPubJson?.data?.test?.id === draftTest.id)

  // Direct draft test ID lookup
  const stuDraftRes = await studentPage.request.post(`${BASE_URL}/api/exam/attempt/start`, {
    data: { testId: draftTest.id, language: "English" },
  })
  console.log(`\n[STUDENT -> Direct Draft Test ID (${draftTest.id})] HTTP Status:`, stuDraftRes.status())
  const stuDraftJson = await stuDraftRes.json()
  console.log("Response Body:", JSON.stringify(stuDraftJson, null, 2))

  await studentContext.close()

  // 2. TEACHER owner requests
  console.log("\n--- 2. Testing as TEACHER OWNER (teacher_owner@test.local) ---")
  const teacher = await prisma.user.findUnique({ where: { email: "teacher_owner@test.local" } })
  const teacherCountBefore = await prisma.examAttempt.count({ where: { userId: teacher!.id } })
  console.log("Teacher ExamAttempt rows BEFORE:", teacherCountBefore)

  const teacherContext = await browser.newContext()
  const teacherPage = await teacherContext.newPage()
  await login(teacherPage, "teacher_owner@test.local")
  
  // Teacher requesting draft test by ID (with retake: true so new attempt is created)
  const teaDraftRes = await teacherPage.request.post(`${BASE_URL}/api/exam/attempt/start`, {
    data: { testId: draftTest.id, language: "English", retake: true },
  })
  console.log(`[TEACHER -> Draft Test ID (${draftTest.id})] HTTP Status:`, teaDraftRes.status())
  const teaDraftJson = await teaDraftRes.json()
  console.log("Response Body:", JSON.stringify({
    status: teaDraftRes.status(),
    attemptId: teaDraftJson?.data?.attemptId,
    testId: teaDraftJson?.data?.testId,
    testTitle: teaDraftJson?.data?.test?.title,
  }, null, 2))

  const teacherCountAfter = await prisma.examAttempt.count({ where: { userId: teacher!.id } })
  console.log("Teacher ExamAttempt rows AFTER:", teacherCountAfter)
  console.log("Row created for Teacher preview attempt?", teacherCountAfter > teacherCountBefore)

  await teacherContext.close()

  // 3. ADMIN requests
  console.log("\n--- 3. Testing as ADMIN (admin_test@example.com) ---")
  const admin = await prisma.user.findUnique({ where: { email: "admin_test@example.com" } })
  const adminCountBefore = await prisma.examAttempt.count({ where: { userId: admin!.id } })
  console.log("Admin ExamAttempt rows BEFORE:", adminCountBefore)

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await login(adminPage, "admin_test@example.com")
  
  // Admin requesting draft test by ID (with retake: true so new attempt is created)
  const admDraftRes = await adminPage.request.post(`${BASE_URL}/api/exam/attempt/start`, {
    data: { testId: draftTest.id, language: "English", retake: true },
  })
  console.log(`[ADMIN -> Draft Test ID (${draftTest.id})] HTTP Status:`, admDraftRes.status())
  const admDraftJson = await admDraftRes.json()
  console.log("Response Body:", JSON.stringify({
    status: admDraftRes.status(),
    attemptId: admDraftJson?.data?.attemptId,
    testId: admDraftJson?.data?.testId,
    testTitle: admDraftJson?.data?.test?.title,
  }, null, 2))

  const adminCountAfter = await prisma.examAttempt.count({ where: { userId: admin!.id } })
  console.log("Admin ExamAttempt rows AFTER:", adminCountAfter)
  console.log("Row created for Admin preview attempt?", adminCountAfter > adminCountBefore)

  await adminContext.close()
  await browser.close()
}

main().catch(console.error).finally(() => process.exit(0))
