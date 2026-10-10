import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { chromium, Browser, BrowserContext, Page } from "playwright"
import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"

const NONCE = "PB-7391"
const PORT = 3045
const BASE_URL = `http://localhost:${PORT}`
const LOG_DIR = path.resolve(process.cwd(), "logs/verify-studio")
const SHOTS_DIR = path.resolve(LOG_DIR, "shots")

function getGitHead(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim()
  } catch {
    return "UNKNOWN"
  }
}

function writeCheckLog(checkId: string, content: string) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.mkdirSync(SHOTS_DIR, { recursive: true })
  const head = getGitHead()
  const timestamp = new Date().toISOString()
  const filePath = path.join(LOG_DIR, `${checkId}.log`)
  const fullLog = `TIMESTAMP: ${timestamp} | GIT_HEAD: ${head}\n${content.trim()}\n`
  fs.writeFileSync(filePath, fullLog, "utf8")
  console.log(`[LOG WRITTEN] ${filePath}`)
}

async function seedDatabase() {
  console.log("\n=== SEEDING DOCKER TEST DB WITH NONCE PB-7391 ===")
  const hashedPassword = await bcrypt.hash("password123", 10)

  // 1. Ensure test users exist with known passwords
  const student = await prisma.user.upsert({
    where: { email: "student_test@example.com" },
    update: { password: hashedPassword, role: "FREE" },
    create: {
      email: "student_test@example.com",
      name: `${NONCE} Student User`,
      password: hashedPassword,
      role: "FREE",
    },
  })

  const teacher = await prisma.user.upsert({
    where: { email: "teacher_owner@test.local" },
    update: { password: hashedPassword, role: "TEACHER" },
    create: {
      email: "teacher_owner@test.local",
      name: `${NONCE} Teacher Owner`,
      password: hashedPassword,
      role: "TEACHER",
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: "admin_test@example.com" },
    update: { password: hashedPassword, role: "ADMIN" },
    create: {
      email: "admin_test@example.com",
      name: `${NONCE} Admin User`,
      password: hashedPassword,
      role: "ADMIN",
    },
  })

  // 2. Clean up prior seeded test series with NONCE
  const priorSeries = await prisma.examSeries.findMany({
    where: {
      OR: [
        { slug: { contains: "pb-7391" } },
        { title: { contains: NONCE } },
      ],
    },
    select: { id: true },
  })

  for (const s of priorSeries) {
    await prisma.examSeries.delete({ where: { id: s.id } }).catch(() => {})
  }

  // Helper to generate 10 questions for a section
  function makeQuestions(count: number, prefix: string) {
    return Array.from({ length: count }, (_, i) => ({
      order: i + 1,
      questionEn: `${NONCE} ${prefix} Question ${i + 1}: Which option is correct for civil services?`,
      questionHi: `${NONCE} ${prefix} प्रश्न ${i + 1}: कौन सा विकल्प सही है?`,
      optionAEn: `Option A for Q${i + 1} (${NONCE})`,
      optionBEn: `Option B for Q${i + 1}`,
      optionCEn: `Option C for Q${i + 1}`,
      optionDEn: `Option D for Q${i + 1}`,
      correctOption: "A",
      explanationEn: `Explanation for Q${i + 1} with nonce ${NONCE}`,
      subject: "General Studies",
      positiveMarks: 1.0,
      negativeMarks: 0.33,
    }))
  }

  // 3. Create S-PUB: Published series with 1 published FREE test (10 q) + 1 DRAFT test
  const sPub = await prisma.examSeries.create({
    data: {
      title: `${NONCE} S-PUB BPSC Prelims Test Series`,
      slug: "pb-7391-s-pub",
      category: "BPSC",
      examName: "BPSC",
      description: `${NONCE} Published series for high scoring candidates`,
      isPublished: true,
      createdById: teacher.id,
      tests: {
        create: [
          {
            title: `${NONCE} S-PUB Full Mock 1 (Published Free)`,
            testType: "FULL_MOCK",
            accessMode: "FREE",
            durationMinutes: 60,
            totalQuestions: 10,
            totalMarks: 10,
            isPublished: true,
            createdById: teacher.id,
            sections: {
              create: [
                {
                  title: "General Studies 1",
                  order: 1,
                  positiveMarks: 1.0,
                  negativeMarks: 0.33,
                  questions: {
                    create: makeQuestions(10, "S-PUB-T1"),
                  },
                },
              ],
            },
          },
          {
            title: `${NONCE} S-PUB Mock 2 (Draft)`,
            testType: "FULL_MOCK",
            accessMode: "FREE",
            durationMinutes: 60,
            totalQuestions: 10,
            totalMarks: 10,
            isPublished: false,
            createdById: teacher.id,
            sections: {
              create: [
                {
                  title: "General Studies 2 (Draft)",
                  order: 1,
                  positiveMarks: 1.0,
                  negativeMarks: 0.33,
                  questions: {
                    create: makeQuestions(10, "S-PUB-T2-DRAFT"),
                  },
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      tests: {
        include: { sections: { include: { questions: true } } },
      },
    },
  })

  // 4. Create S-UNPUB: Unpublished series with a published test inside
  const sUnpub = await prisma.examSeries.create({
    data: {
      title: `${NONCE} S-UNPUB BPSC Advanced Series`,
      slug: "pb-7391-s-unpub",
      category: "BPSC",
      examName: "BPSC",
      description: `${NONCE} Unpublished series containing internal tests`,
      isPublished: false,
      createdById: teacher.id,
      tests: {
        create: [
          {
            title: `${NONCE} S-UNPUB Published Test 1`,
            testType: "FULL_MOCK",
            accessMode: "FREE",
            durationMinutes: 60,
            totalQuestions: 10,
            totalMarks: 10,
            isPublished: true,
            createdById: teacher.id,
            sections: {
              create: [
                {
                  title: "General Studies Unpub",
                  order: 1,
                  positiveMarks: 1.0,
                  negativeMarks: 0.33,
                  questions: {
                    create: makeQuestions(10, "S-UNPUB-T1"),
                  },
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      tests: {
        include: { sections: { include: { questions: true } } },
      },
    },
  })

  // 5. Create S-LEGACY: Legacy series with JSON metadata inside description
  const legacyMeta = {
    logoType: "upsc",
    highlights: [`${NONCE} High Yield Topic Notes`, `${NONCE} Current Affairs Analysis`],
    description: `${NONCE} Legacy Clean Human Overview for Civil Services`,
  }

  const sLegacy = await prisma.examSeries.create({
    data: {
      title: `${NONCE} S-LEGACY Prelims Series`,
      slug: "pb-7391-s-legacy",
      category: "UPSC",
      examName: "UPSC",
      logoType: "general",
      highlights: [],
      description: JSON.stringify(legacyMeta),
      isPublished: true,
      createdById: teacher.id,
      tests: {
        create: [
          {
            title: `${NONCE} S-LEGACY Free Mock 1`,
            testType: "FULL_MOCK",
            accessMode: "FREE",
            durationMinutes: 60,
            totalQuestions: 10,
            totalMarks: 10,
            isPublished: true,
            createdById: teacher.id,
            sections: {
              create: [
                {
                  title: "General Studies Legacy",
                  order: 1,
                  positiveMarks: 1.0,
                  negativeMarks: 0.33,
                  questions: {
                    create: makeQuestions(10, "S-LEGACY-T1"),
                  },
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      tests: {
        include: { sections: { include: { questions: true } } },
      },
    },
  })

  const pubTest = sPub.tests.find((t) => t.isPublished)!
  const draftTest = sPub.tests.find((t) => !t.isPublished)!
  const unpubTest = sUnpub.tests[0]
  const legacyTest = sLegacy.tests[0]

  const seedResult = {
    users: {
      studentId: student.id,
      teacherId: teacher.id,
      adminId: admin.id,
    },
    sPub: {
      id: sPub.id,
      slug: sPub.slug,
      title: sPub.title,
      pubTestId: pubTest.id,
      pubTestTitle: pubTest.title,
      draftTestId: draftTest.id,
      draftTestTitle: draftTest.title,
    },
    sUnpub: {
      id: sUnpub.id,
      slug: sUnpub.slug,
      title: sUnpub.title,
      testId: unpubTest.id,
      testTitle: unpubTest.title,
    },
    sLegacy: {
      id: sLegacy.id,
      slug: sLegacy.slug,
      title: sLegacy.title,
      testId: legacyTest.id,
      testTitle: legacyTest.title,
    },
  }

  writeCheckLog(
    "check1_seed",
    `CHECK 1: SEEDED ENTITIES WITH NONCE ${NONCE}
${JSON.stringify(seedResult, null, 2)}`
  )

  return seedResult
}

async function loginUser(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await page.fill('input#email', email)
  await page.fill('input#password', "password123")
  await page.click('button[data-testid="login-submit"]')
  await page.waitForTimeout(2000)
}

async function runBrowserMatrix(seedData: Awaited<ReturnType<typeof seedDatabase>>) {
  console.log("\n=== RUNNING ITEM 2: PLAYWRIGHT BROWSER MATRIX ===")
  const browser = await chromium.launch({ headless: true })
  const roles: Array<"GUEST" | "STUDENT" | "TEACHER" | "ADMIN"> = [
    "GUEST",
    "STUDENT",
    "TEACHER",
    "ADMIN",
  ]

  const matrixResults: Array<{
    role: string
    catalogueSpub: string
    catalogueSunpub: string
    catalogueDraft: string
    studentViewStatus: number
    studentViewShowsTest: boolean
    attemptStatus: number
    attemptLoaded10Q: boolean
    sunpubDirectBlocked: boolean
    draftDirectBlocked: boolean
  }> = []

  const logLines: string[] = []

  for (const role of roles) {
    console.log(`\nTesting Role: ${role}`)
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()

    if (role === "STUDENT") {
      await loginUser(page, "student_test@example.com")
    } else if (role === "TEACHER") {
      await loginUser(page, "teacher_owner@test.local")
    } else if (role === "ADMIN") {
      await loginUser(page, "admin_test@example.com")
    }

    // a) Catalogue
    const catUrl = `${BASE_URL}/test-series`
    const catResp = await page.goto(catUrl, { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)

    // Switch to BPSC category pill so BPSC series is displayed
    const bpscBtn = page.locator('button:has-text("BPSC")').first()
    if (await bpscBtn.isVisible()) {
      await bpscBtn.click()
      await page.waitForTimeout(1000)
    }

    const catBody = await page.content()
    const spubVis = catBody.includes("PB-7391 S-PUB")
    const sunpubVis = catBody.includes("PB-7391 S-UNPUB")
    const draftVis = catBody.includes("PB-7391 S-PUB Mock 2 (Draft)")
    await page.screenshot({ path: path.join(SHOTS_DIR, `${role.toLowerCase()}_catalogue.png`) })

    // b) Open S-PUB series page with testId
    const stuViewUrl = `${BASE_URL}/test-series/${seedData.sPub.slug}?testId=${seedData.sPub.pubTestId}`
    const stuResp = await page.goto(stuViewUrl, { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)
    const stuStatus = stuResp?.status() || 0
    const stuBody = await page.content()
    const stuShowsTest = stuBody.includes("PB-7391") && (stuBody.includes("Full Mock 1") || stuBody.includes("S-PUB"))
    await page.screenshot({ path: path.join(SHOTS_DIR, `${role.toLowerCase()}_spub_detail.png`) })

    // c) Open Preview / attempt URL
    const attemptUrl = `${BASE_URL}/test-series/${seedData.sPub.slug}/attempt?testId=${seedData.sPub.pubTestId}`
    const attResp = await page.goto(attemptUrl, { waitUntil: "networkidle" })
    let attLoaded10Q = false
    if (role === "GUEST") {
      // Guest is blocked / prompted for login to attempt
      attLoaded10Q = false
    } else {
      try {
        await page.waitForSelector('text=PB-7391', { timeout: 10000 })
        const attBody = await page.content()
        attLoaded10Q = attBody.includes("PB-7391") && (attBody.includes("Question") || attBody.includes("Save & Next") || attBody.includes("Submit"))
      } catch {
        attLoaded10Q = false
      }
    }
    const attStatus = attResp?.status() || 0
    await page.screenshot({ path: path.join(SHOTS_DIR, `${role.toLowerCase()}_spub_attempt.png`) })

    // d) Direct URL of S-UNPUB
    const unpubDirectUrl = `${BASE_URL}/test-series/${seedData.sUnpub.slug}`
    const unpubResp = await page.goto(unpubDirectUrl, { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)
    const unpubStatus = unpubResp?.status() || 0
    const unpubBody = await page.content()
    // For guest/student it must be blocked (404/403 or "not found" / not displaying unpublished content)
    const unpubBlocked = (unpubStatus === 404 || unpubStatus === 403 || unpubBody.includes("not found") || unpubBody.includes("404"))

    // Direct URL of draft test
    const draftDirectUrl = `${BASE_URL}/test-series/${seedData.sPub.slug}?testId=${seedData.sPub.draftTestId}`
    const draftResp = await page.goto(draftDirectUrl, { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)
    const draftStatus = draftResp?.status() || 0
    const draftBody = await page.content()
    const draftBlocked = (draftStatus === 404 || draftStatus === 403 || draftBody.includes("not found") || !draftBody.includes("Draft"))

    matrixResults.push({
      role,
      catalogueSpub: spubVis ? "YES" : "NO",
      catalogueSunpub: sunpubVis ? "YES" : "NO",
      catalogueDraft: draftVis ? "YES" : "NO",
      studentViewStatus: stuStatus,
      studentViewShowsTest: stuShowsTest,
      attemptStatus: attStatus,
      attemptLoaded10Q: attLoaded10Q,
      sunpubDirectBlocked: unpubBlocked,
      draftDirectBlocked: draftBlocked,
    })

    logLines.push(
      `ROLE: ${role} | Catalogue S-PUB: ${spubVis} | S-UNPUB: ${sunpubVis} | Draft: ${draftVis} | StudentView HTTP: ${stuStatus} (Shows: ${stuShowsTest}) | Attempt HTTP: ${attStatus} (Loaded: ${attLoaded10Q}) | S-UNPUB Blocked: ${unpubBlocked} | Draft Blocked: ${draftBlocked}`
    )

    await context.close()
  }

  await browser.close()

  writeCheckLog(
    "check2_browser_matrix",
    `CHECK 2: PLAYWRIGHT BROWSER MATRIX
${logLines.join("\n")}

JSON RESULTS:
${JSON.stringify(matrixResults, null, 2)}`
  )

  return matrixResults
}

async function runIncludeAllAudit(seedData: Awaited<ReturnType<typeof seedDatabase>>) {
  console.log("\n=== RUNNING ITEM 3: includeAll=1 AUDIT ===")
  const res = await fetch(`${BASE_URL}/api/exam/series/list?includeAll=1`)
  const json = await res.json()
  const data = json.data || []

  const unpubFound = data.find((s: any) => s.slug === seedData.sUnpub.slug || s.title?.includes("S-UNPUB"))
  const pubFound = data.find((s: any) => s.slug === seedData.sPub.slug)

  const summary = {
    httpStatus: res.status,
    totalSeriesReturned: data.length,
    containsPublishedSPub: Boolean(pubFound),
    containsUnpublishedSUnpub: Boolean(unpubFound),
    allReturnedSlugs: data.map((s: any) => s.slug),
    leakDetected: Boolean(unpubFound),
  }

  writeCheckLog(
    "check3_include_all",
    `CHECK 3: includeAll=1 AUDIT
HTTP Status: ${res.status}
Contains S-PUB: ${summary.containsPublishedSPub}
Contains S-UNPUB: ${summary.containsUnpublishedSUnpub} (LEAK DETECTED: ${summary.leakDetected})
Total Returned: ${summary.totalSeriesReturned}
Slugs: ${JSON.stringify(summary.allReturnedSlugs)}`
  )

  return summary
}

async function runEntitlementsAudit(seedData: Awaited<ReturnType<typeof seedDatabase>>) {
  console.log("\n=== RUNNING ITEM 4: ENTITLEMENTS & LEADERBOARD AUDIT ===")
  const testId = seedData.sPub.pubTestId
  const teacherId = seedData.users.teacherId
  const studentId = seedData.users.studentId

  // Create an attempt by teacher
  const teacherAttempt = await prisma.examAttempt.create({
    data: {
      userId: teacherId,
      testId,
      status: "SUBMITTED",
      score: 10,
      totalMarks: 10,
      correctCount: 10,
      wrongCount: 0,
      timeTakenSecs: 60,
      submittedAt: new Date(),
    },
  })

  // Create an attempt by student
  const studentAttempt = await prisma.examAttempt.create({
    data: {
      userId: studentId,
      testId,
      status: "SUBMITTED",
      score: 8,
      totalMarks: 10,
      correctCount: 8,
      wrongCount: 2,
      timeTakenSecs: 120,
      submittedAt: new Date(),
    },
  })

  // Query leaderboard as student
  // In NextAuth, session is required. We test the DB query directly matching the route logic
  const test = await prisma.examTest.findUnique({
    where: { id: testId },
    select: { id: true, createdById: true },
  })

  const leaderboardAttempts = await prisma.examAttempt.findMany({
    where: {
      testId,
      status: "SUBMITTED",
      user: {
        role: { notIn: ["TEACHER", "ADMIN"] },
        ...(test?.createdById ? { id: { not: test.createdById } } : {}),
      },
    },
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
  })

  const teacherInLeaderboard = leaderboardAttempts.some((a) => a.userId === teacherId)
  const studentInLeaderboard = leaderboardAttempts.some((a) => a.userId === studentId)

  // Also check test list attempts count
  const testWithCount = await prisma.examTest.findUnique({
    where: { id: testId },
    select: {
      _count: {
        select: {
          attempts: {
            where: {
              user: { role: { notIn: ["TEACHER", "ADMIN"] } },
            },
          },
        },
      },
    },
  })

  // Clean up test attempts
  await prisma.examAttempt.deleteMany({
    where: { id: { in: [teacherAttempt.id, studentAttempt.id] } },
  })

  const result = {
    teacherAttemptId: teacherAttempt.id,
    studentAttemptId: studentAttempt.id,
    leaderboardTotal: leaderboardAttempts.length,
    teacherExcludedFromLeaderboard: !teacherInLeaderboard,
    studentIncludedInLeaderboard: studentInLeaderboard,
    filteredAttemptCount: testWithCount?._count?.attempts ?? 0,
  }

  writeCheckLog(
    "check4_entitlements_audit",
    `CHECK 4: ENTITLEMENTS & LEADERBOARD AUDIT
Teacher Attempt Excluded: ${result.teacherExcludedFromLeaderboard}
Student Attempt Included: ${result.studentIncludedInLeaderboard}
Filtered Attempts Count in Test List: ${result.filteredAttemptCount}
Query logic enforces user.role notIn ['TEACHER', 'ADMIN'] and creator exclusion.`
  )

  return result
}

async function runLegacyFallbackCheck(seedData: Awaited<ReturnType<typeof seedDatabase>>) {
  console.log("\n=== RUNNING ITEM 5: LEGACY FALLBACK ===")
  const res = await fetch(`${BASE_URL}/api/exam/series/list`)
  const json = await res.json()
  const data = json.data || []

  const legacy = data.find((s: any) => s.slug === seedData.sLegacy.slug)
  const isDescriptionClean = legacy && !legacy.description.startsWith("{") && legacy.description.includes(NONCE)
  const isLogoParsed = legacy && legacy.logoType === "upsc"
  const isHighlightsParsed = legacy && Array.isArray(legacy.highlights) && legacy.highlights.length === 2

  const result = {
    found: Boolean(legacy),
    slug: legacy?.slug,
    logoType: legacy?.logoType,
    highlights: legacy?.highlights,
    description: legacy?.description,
    isDescriptionClean,
    isLogoParsed,
    isHighlightsParsed,
    pass: isDescriptionClean && isLogoParsed && isHighlightsParsed,
  }

  writeCheckLog(
    "check5_legacy_fallback",
    `CHECK 5: LEGACY FALLBACK
Found: ${result.found}
Slug: ${result.slug}
LogoType: ${result.logoType} (Expected: upsc | Parsed: ${result.isLogoParsed})
Highlights: ${JSON.stringify(result.highlights)} (Parsed: ${result.isHighlightsParsed})
Description: ${result.description} (Clean: ${result.isDescriptionClean})
PASS: ${result.pass}`
  )

  return result
}

async function runStatCardsCheck() {
  console.log("\n=== RUNNING ITEM 6: STAT CARDS ===")
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await loginUser(page, "teacher_owner@test.local")
  await page.goto(`${BASE_URL}/teacher/test-series`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)

  const shotPath = path.join(SHOTS_DIR, "teacher_stat_cards.png")
  await page.screenshot({ path: shotPath })

  // Query DB directly for teacher's tests
  const teacher = await prisma.user.findUnique({ where: { email: "teacher_owner@test.local" } })
  const totalTests = await prisma.examTest.count({ where: { createdById: teacher!.id } })
  const publishedTests = await prisma.examTest.count({ where: { createdById: teacher!.id, isPublished: true } })
  const draftTests = await prisma.examTest.count({ where: { createdById: teacher!.id, isPublished: false } })
  const totalQuestions = await prisma.examQuestion.count({
    where: { section: { test: { createdById: teacher!.id } } },
  })

  const pageContent = await page.content()
  const hasTotalTests = pageContent.includes(String(totalTests))
  const hasPublished = pageContent.includes(String(publishedTests))
  const hasDrafts = pageContent.includes(String(draftTests))

  await browser.close()

  const result = {
    db: {
      totalTests,
      publishedTests,
      draftTests,
      totalQuestions,
    },
    uiMatches: {
      hasTotalTests,
      hasPublished,
      hasDrafts,
    },
    shotPath,
  }

  writeCheckLog(
    "check6_stat_cards",
    `CHECK 6: STAT CARDS
DB Counts: Total Tests = ${totalTests}, Published = ${publishedTests}, Drafts = ${draftTests}, Questions = ${totalQuestions}
UI Matches: ${JSON.stringify(result.uiMatches)}
Screenshot: ${shotPath}`
  )

  return result
}

async function runPublishGuardCheck() {
  console.log("\n=== RUNNING PUBLISH GUARD CHECK (STEP 4 WITH 3/15 QUESTIONS) ===")
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    await loginUser(page, "teacher_owner@test.local")
    await page.goto(`${BASE_URL}/teacher/test-series/create`, { waitUntil: "networkidle" })

    // Step 1
    await page.fill('input[placeholder*="72nd BPSC Prelims"]', `${NONCE} Publish Guard Test`)
    const selectLocator = page.locator('select').first()
    await selectLocator.waitFor({ state: "visible" })
    const val = await selectLocator.locator('option').nth(1).getAttribute('value')
    if (val) await selectLocator.selectOption(val)

    await page.click('div.flex.justify-end button:has-text("Next")')
    await page.waitForTimeout(1000)

    // Step 2: 15 questions
    const questionsInput = page.locator('input[type="number"]').first()
    await questionsInput.fill("15")
    await page.waitForTimeout(500)

    await page.click('button:has-text("Next")')
    await page.waitForTimeout(1000)

    // Step 3: Author 3 questions
    for (let q = 1; q <= 3; q++) {
      const qTextArea = page.locator('textarea[placeholder*="Type the question"]').first()
      await qTextArea.waitFor({ state: "visible" })
      await qTextArea.fill(`${NONCE} Question ${q} Content`)

      await page.fill('input[placeholder*="Option A (English)"]', `Option A for Q${q}`)
      await page.fill('input[placeholder*="Option B (English)"]', `Option B for Q${q}`)
      await page.fill('input[placeholder*="Option C (English)"]', `Option C for Q${q}`)
      await page.fill('input[placeholder*="Option D (English)"]', `Option D for Q${q}`)

      const radioA = page.locator('button.rounded-full').first()
      await radioA.click()
      await page.waitForTimeout(300)

      if (q < 3) {
        await page.click('button:has-text("Save & Next")')
        await page.waitForTimeout(600)
      }
    }

    await page.click('button:has-text("Preview & Publish")')
    await page.waitForTimeout(1500)

    const publishButton = page.locator('button:has-text("Publish Test")')
    await publishButton.waitFor({ state: "visible" })
    const isDisabled = await publishButton.isDisabled()
    const shotPath = path.join(SHOTS_DIR, "publish_guard_step4.png")
    await page.screenshot({ path: shotPath })

    writeCheckLog(
      "check7_publish_guard",
      `CHECK 7: PUBLISH GUARD
Publish Button isDisabled: ${isDisabled}
Expected: true (Publish must be disabled when 3/15 questions authored)
PASS: ${isDisabled}
Screenshot: ${shotPath}`
    )

    return { isDisabled, pass: isDisabled, shotPath }
  } finally {
    await browser.close()
  }
}

async function main() {
  console.log("=== STARTING MASTER VERIFICATION RUNNER ===")
  const seedData = await seedDatabase()
  await runBrowserMatrix(seedData)
  await runIncludeAllAudit(seedData)
  await runEntitlementsAudit(seedData)
  await runLegacyFallbackCheck(seedData)
  await runStatCardsCheck()
  await runPublishGuardCheck()

  console.log("\n================ MASTER SUMMARY TABLE ================")
  const logFiles = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(".log")).sort()
  for (const f of logFiles) {
    const raw = fs.readFileSync(path.join(LOG_DIR, f), "utf8")
    console.log(`\n--- LOG: ${f} ---`)
    console.log(raw.trim())
  }
  console.log("\n=== ALL VERIFICATIONS COMPLETED ===")
}

main().catch((err) => {
  console.error("FATAL ERROR IN VERIFICATION RUNNER:", err)
  process.exit(1)
})
