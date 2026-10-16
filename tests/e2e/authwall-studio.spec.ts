import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, slugFor, loginAs } from "./test-series-e2e-helpers"
import bcrypt from "bcryptjs"

test.describe("Authwall: Studio Controls, Bulk Actions, Authorization & Import Safety", () => {
  test.setTimeout(120_000)

  let nonce: string
  let teacherA: any
  let teacherB: any
  let adminUser: any
  let guestPackageA: any
  let test1: any
  let test2: any
  let test3: any

  let tutorialCourse: any
  let tutorialChapter1: any
  let tutorialChapter2: any
  let tutorialLesson1: any
  let tutorialLesson2: any

  const SECRET_CONTENT = "CONFIDENTIAL_TUTORIAL_DEEP_DIVE_KNOWLEDGE"
  const PREVIEW_CONTENT = "PUBLIC_INTRODUCTION_TUTORIAL_CONTENT"

  test.beforeAll(async () => {
    nonce = newNonce()
    const passwordHash = await bcrypt.hash(PASSWORD, 10)

    // 1. Actors
    teacherA = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-teacher-a@test.local`,
        name: `Teacher A ${nonce}`,
        password: passwordHash,
        role: "TEACHER",
        selectedGoal: "bpsc",
      },
    })

    teacherB = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-teacher-b@test.local`,
        name: `Teacher B ${nonce}`,
        password: passwordHash,
        role: "TEACHER",
        selectedGoal: "bpsc",
      },
    })

    adminUser = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-admin@test.local`,
        name: `Admin ${nonce}`,
        password: passwordHash,
        role: "ADMIN",
        selectedGoal: "bpsc",
      },
    })

    // 2. Exam Package for Teacher A with 3 tests
    guestPackageA = await prisma.examSeries.create({
      data: {
        title: `Package Alpha Studio ${nonce}`,
        slug: `${slugFor(nonce)}-pkg-alpha`,
        examName: "BPSC Studio Mock",
        category: "Civil Services",
        description: "Package for testing studio gate controls",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
        seoMode: "preview",
        gateTitle: "Alpha Series Authwall",
        gateSubtitle: "Sign in to access mock tests",
        createdById: teacherA.id,
      },
    })

    test1 = await prisma.examTest.create({
      data: {
        seriesId: guestPackageA.id,
        title: `Test 1 - Prelims Mock ${nonce}`,
        testType: "FULL_MOCK",
        accessMode: "PRO",
        durationMinutes: 60,
        totalQuestions: 50,
        totalMarks: 100,
        isPublished: true,
        createdById: teacherA.id,
        gateMode: "inherit",
      },
    })

    test2 = await prisma.examTest.create({
      data: {
        seriesId: guestPackageA.id,
        title: `Test 2 - Mains Answer Writing ${nonce}`,
        testType: "SECTIONAL_TEST",
        accessMode: "PRO",
        durationMinutes: 45,
        totalQuestions: 30,
        totalMarks: 60,
        isPublished: true,
        createdById: teacherA.id,
        gateMode: "inherit",
      },
    })

    test3 = await prisma.examTest.create({
      data: {
        seriesId: guestPackageA.id,
        title: `Test 3 - CSAT Aptitude ${nonce}`,
        testType: "PREVIOUS_YEAR",
        accessMode: "FREE",
        durationMinutes: 30,
        totalQuestions: 25,
        totalMarks: 50,
        isPublished: true,
        createdById: teacherA.id,
        gateMode: "inherit",
      },
    })

    // 3. Tutorial Course for testing Import Preservation & Immediate Guest Sync
    tutorialCourse = await prisma.course.create({
      data: {
        title: `Tutorial Studio Gate ${nonce}`,
        slug: `tutorial-studio-gate-${nonce.toLowerCase()}`,
        description: "Course for verifying import safety and guest synchronization",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isGated: false, // Initially UNGATED
        previewPercentage: 25,
        seoMode: "preview",
        gateTitle: "Exclusive Legal Tutorial Gate",
        gateSubtitle: "Subscribe or sign up to unlock",
      },
    })

    tutorialChapter1 = await prisma.chapter.create({
      data: {
        title: `Chapter 1 - Foundational Rights`,
        courseId: tutorialCourse.id,
        order: 1,
        gateMode: "free", // Explicit Free
      },
    })

    tutorialChapter2 = await prisma.chapter.create({
      data: {
        title: `Chapter 2 - Constitutional Remedies`,
        courseId: tutorialCourse.id,
        order: 2,
        gateMode: "locked", // Explicit Locked
      },
    })

    const multiParagraphHtml = [
      `<h2>${PREVIEW_CONTENT}</h2>`,
      `<p>Introductory paragraph discussing background and scope of rights.</p>`,
      `<p>Detailed article breakdowns.</p>`,
      `<p>${SECRET_CONTENT}</p>`,
    ].join("\n")

    tutorialLesson1 = await prisma.lesson.create({
      data: {
        title: "Lesson 1: Directive Principles",
        chapterId: tutorialChapter1.id,
        order: 1,
        content: multiParagraphHtml,
        type: "TUTORIAL",
      },
    })

    tutorialLesson2 = await prisma.lesson.create({
      data: {
        title: "Lesson 2: Habeas Corpus",
        chapterId: tutorialChapter2.id,
        order: 1,
        content: multiParagraphHtml,
        type: "TUTORIAL",
      },
    })
  })

  test.afterAll(async () => {
    // Cleanup
    try {
      if (tutorialCourse?.id) {
        await prisma.lesson.deleteMany({ where: { chapter: { courseId: tutorialCourse.id } } })
        await prisma.chapter.deleteMany({ where: { courseId: tutorialCourse.id } })
        await prisma.course.delete({ where: { id: tutorialCourse.id } })
      }
      if (guestPackageA?.id) {
        await prisma.examTest.deleteMany({ where: { seriesId: guestPackageA.id } })
        await prisma.examSeries.delete({ where: { id: guestPackageA.id } })
      }
      if (teacherA?.id) await prisma.user.delete({ where: { id: teacherA.id } })
      if (teacherB?.id) await prisma.user.delete({ where: { id: teacherB.id } })
      if (adminUser?.id) await prisma.user.delete({ where: { id: adminUser.id } })
    } catch (e) {
      console.warn("Cleanup warning:", e)
    }
  })

  test("STUDIO-01: Teacher A accesses Test Series Studio and sees GateControlPanel and BulkGateActionBar", async ({ page }) => {
    await loginAs(page, teacherA.email)

    const response = await page.goto(`/teacher/test-series/package/${guestPackageA.id}`)
    expect(response?.status()).toBe(200)

    // Verify studio details view loaded
    await expect(page.locator("[data-testid='package-detail']")).toBeVisible()

    // Verify GateControlPanel rendered with Gated status
    const gateToggle = page.locator("[data-testid='authwall-enable-toggle']")
    await expect(gateToggle).toBeVisible()
    await expect(gateToggle).toHaveAttribute("aria-checked", "true")

    // Verify Default Preview Slider & Input
    const previewInput = page.locator("[data-testid='authwall-preview-input']")
    await expect(previewInput).toBeVisible()
    await expect(previewInput).toHaveValue("20")

    // Verify BulkGateActionBar exists
    const selectAllCheckbox = page.locator("[data-testid='select-all-gate-items']")
    await expect(selectAllCheckbox).toBeVisible()
  })

  test("STUDIO-02: Row selection and bulk actions (Set Free, Set Locked, Set Preview %, Reset Inherit)", async ({ page }) => {
    await loginAs(page, teacherA.email)
    await page.goto(`/teacher/test-series/package/${guestPackageA.id}`)

    // 1. Toggle individual row checkbox
    const row1Checkbox = page.locator(`[data-testid='select-test-${test1.id}']`)
    await expect(row1Checkbox).toBeVisible()
    await row1Checkbox.click()

    // Bulk buttons should appear
    const setFreeBtn = page.locator("[data-testid='bulk-set-free-btn']")
    const setLockedBtn = page.locator("[data-testid='bulk-set-locked-btn']")
    const setPreviewBtn = page.locator("[data-testid='bulk-set-preview-btn']")
    const resetInheritBtn = page.locator("[data-testid='bulk-reset-inherit-btn']")

    await expect(setFreeBtn).toBeVisible()
    await expect(setLockedBtn).toBeVisible()
    await expect(setPreviewBtn).toBeVisible()
    await expect(resetInheritBtn).toBeVisible()

    // 2. Click "Set Free" on test 1
    await setFreeBtn.click()
    await page.waitForTimeout(600)

    // Verify DB update for test 1
    const updatedTest1Free = await prisma.examTest.findUnique({
      where: { id: test1.id },
      select: { gateMode: true, previewPercentage: true },
    })
    expect(updatedTest1Free?.gateMode).toBe("free")

    // Uncheck test 1
    await row1Checkbox.click()

    // 3. Select test 2 and click "Set Locked"
    const row2Checkbox = page.locator(`[data-testid='select-test-${test2.id}']`)
    await row2Checkbox.click()
    await setLockedBtn.click()
    await page.waitForTimeout(600)

    const updatedTest2Locked = await prisma.examTest.findUnique({
      where: { id: test2.id },
      select: { gateMode: true, previewPercentage: true },
    })
    expect(updatedTest2Locked?.gateMode).toBe("locked")

    // Uncheck test 2
    await row2Checkbox.click()

    // 4. Select test 3, click "Set Preview"
    const row3Checkbox = page.locator(`[data-testid='select-test-${test3.id}']`)
    await row3Checkbox.click()

    await setPreviewBtn.click()
    await page.waitForTimeout(600)

    const updatedTest3Preview = await prisma.examTest.findUnique({
      where: { id: test3.id },
      select: { gateMode: true, previewPercentage: true },
    })
    expect(updatedTest3Preview?.gateMode).toBe("preview")
    expect(updatedTest3Preview?.previewPercentage).toBe(25) // default customPct in BulkGateActionBar is 25

    // Uncheck test 3 so selectedCount is 0
    await row3Checkbox.click()

    // 5. Select all tests via Select All and Reset Inherit
    const selectAllCheckbox = page.locator("[data-testid='select-all-gate-items']")
    await selectAllCheckbox.click()
    await expect(resetInheritBtn).toBeVisible()
    await resetInheritBtn.click()
    await page.waitForTimeout(600)

    const allTests = await prisma.examTest.findMany({
      where: { seriesId: guestPackageA.id },
      select: { id: true, gateMode: true },
    })
    for (const t of allTests) {
      expect(t.gateMode).toBe("inherit")
    }
  })

  test("STUDIO-03: 'Make first N items free' quick action updates database correctly", async ({ page }) => {
    await loginAs(page, teacherA.email)
    await page.goto(`/teacher/test-series/package/${guestPackageA.id}`)

    // When 0 items are selected, Quick Action is visible
    const firstNInput = page.locator("[data-testid='first-n-count-input']")
    const applyBtn = page.locator("[data-testid='make-first-n-free-btn']")

    await expect(firstNInput).toBeVisible()
    await expect(applyBtn).toBeVisible()

    // Set first 2 items free
    await firstNInput.fill("2")
    await applyBtn.click()
    await page.waitForTimeout(800)

    // dbTests are ordered by createdAt: "desc" in getExamPackageDetail
    const tests = await prisma.examTest.findMany({
      where: { seriesId: guestPackageA.id },
      orderBy: { createdAt: "desc" },
    })

    expect(tests.length).toBe(3)
    expect(tests[0]?.gateMode).toBe("free")
    expect(tests[1]?.gateMode).toBe("free")
    expect(tests[2]?.gateMode).toBe("inherit") // Third item remains unchanged
  })

  test("STUDIO-04: Teacher B cannot view or modify Teacher A's gate settings (403 Forbidden)", async ({ page, request }) => {
    // 1. UI route access: Teacher B navigating to Package A
    await loginAs(page, teacherB.email)
    await page.goto(`/teacher/test-series/package/${guestPackageA.id}`)

    // Must show 403 Forbidden Access Denied
    const forbiddenBanner = page.locator("[data-testid='package-forbidden']")
    await expect(forbiddenBanner).toBeVisible()
    await expect(forbiddenBanner).toContainText("Access Denied (403)")

    // 2. Direct API route test: Teacher B trying to PATCH Teacher A's package
    // Obtain session cookie for Teacher B
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name.includes("session-token"))

    const patchRes = await request.patch(`/api/exam/series/packages/${guestPackageA.id}`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        isGated: false,
        previewPercentage: 100,
      },
    })

    expect(patchRes.status()).toBe(403)
    const patchJson = await patchRes.json()
    expect(patchJson.error).toContain("Forbidden")

    // Verify database was NOT modified
    const untouched = await prisma.examSeries.findUnique({
      where: { id: guestPackageA.id },
      select: { isGated: true, previewPercentage: true },
    })
    expect(untouched?.isGated).toBe(true)
    expect(untouched?.previewPercentage).toBe(20)
  })

  test("STUDIO-05: Admin CAN view and update package gate settings", async ({ page, request }) => {
    await loginAs(page, adminUser.email)
    const response = await page.goto(`/admin/test-series/package/${guestPackageA.id}`)
    expect(response?.status()).toBe(200)

    await expect(page.locator("[data-testid='package-detail']")).toBeVisible()
    await expect(page.locator("[data-testid='package-forbidden']")).not.toBeVisible()

    // Admin PATCH call succeeds
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name.includes("session-token"))

    const patchRes = await request.patch(`/api/exam/series/packages/${guestPackageA.id}`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        previewPercentage: 35,
        gateTitle: "Admin Overridden Gate Title",
      },
    })

    expect(patchRes.status()).toBe(200)
    const adminUpdated = await prisma.examSeries.findUnique({
      where: { id: guestPackageA.id },
      select: { previewPercentage: true, gateTitle: true },
    })
    expect(adminUpdated?.previewPercentage).toBe(35)
    expect(adminUpdated?.gateTitle).toBe("Admin Overridden Gate Title")
  })

  test("STUDIO-06: JSON/HTML tutorial import preserves course and chapter gate settings", async ({ request, page }) => {
    // 1. Establish initial course gate settings
    await prisma.course.update({
      where: { id: tutorialCourse.id },
      data: {
        externalId: `ext-${nonce.toLowerCase()}`,
        isGated: true,
        previewPercentage: 42,
        seoMode: "bot-full",
        gateTitle: "Preserved Super Title",
        gateSubtitle: "Preserved Super Subtitle",
      },
    })

    await prisma.chapter.update({
      where: { id: tutorialChapter1.id },
      data: {
        externalId: `phase-1-${nonce.toLowerCase()}`,
        gateMode: "free",
      },
    })

    // 2. Perform import payload matching existing course externalId
    await loginAs(page, adminUser.email)
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name.includes("session-token"))

    const importPayload = {
      schema: 1,
      meta: {
        id: `ext-${nonce.toLowerCase()}`,
        title: `Tutorial Studio Gate ${nonce}`,
        subject: "law",
        level: "Beginner",
      },
      phases: [
        {
          id: `phase-1-${nonce.toLowerCase()}`,
          title: `Chapter 1 - Foundational Rights Updated`,
          chapters: [
            {
              id: `lesson-1-${nonce.toLowerCase()}`,
              title: "Lesson 1: Directive Principles Updated",
              content: "<p>Updated content via importer</p>",
            },
          ],
        },
      ],
      publishImmediately: true,
    }

    const importRes = await request.post("/api/admin/tutorials/import", {
      headers: {
        "Content-Type": "application/json",
        Cookie: `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: importPayload,
    })

    expect(importRes.status()).toBe(200)

    // 3. Assert course gate settings were NOT overwritten by import
    const reloadedCourse = await prisma.course.findUnique({
      where: { id: tutorialCourse.id },
      select: {
        isGated: true,
        previewPercentage: true,
        seoMode: true,
        gateTitle: true,
        gateSubtitle: true,
      },
    })

    expect(reloadedCourse?.isGated).toBe(true)
    expect(reloadedCourse?.previewPercentage).toBe(42)
    expect(reloadedCourse?.seoMode).toBe("bot-full")
    expect(reloadedCourse?.gateTitle).toBe("Preserved Super Title")
    expect(reloadedCourse?.gateSubtitle).toBe("Preserved Super Subtitle")

    // Chapter 1 gateMode must still be "free"
    const reloadedChapter1 = await prisma.chapter.findUnique({
      where: { id: tutorialChapter1.id },
      select: { gateMode: true },
    })
    expect(reloadedChapter1?.gateMode).toBe("free")
  })

  test("STUDIO-07: Guest view updates immediately after saving gate controls", async ({ page, context }) => {
    // 1. Initial State: Course is gated with chapter 1 locked (0%)
    await prisma.course.update({
      where: { id: tutorialCourse.id },
      data: {
        isGated: true,
        previewPercentage: 20,
      },
    })
    await prisma.chapter.update({
      where: { id: tutorialChapter1.id },
      data: { gateMode: "locked" },
    })

    // Guest visits tutorial (lands on Chapter 1)
    await context.clearCookies()
    await page.goto(`/tutorials/${tutorialCourse.slug}`)

    const startBtn = page.getByRole("button", { name: /Start Reading Tutorial|Directive Principles|Habeas Corpus/i }).first()
    await startBtn.waitFor({ state: "visible", timeout: 10000 })
    await startBtn.click()

    // On Chapter 1: it is locked so AuthwallGate is present
    const gate1 = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(gate1).toBeVisible()

    // 2. Teacher ungates Chapter 1 by setting gateMode to "free"
    await prisma.chapter.update({
      where: { id: tutorialChapter1.id },
      data: { gateMode: "free" },
    })

    // 3. Guest refreshes page: full content immediately visible without server restart
    await page.reload()
    const reloadStartBtn = page.getByRole("button", { name: /Start Reading Tutorial|Directive Principles|Habeas Corpus/i }).first()
    await reloadStartBtn.waitFor({ state: "visible", timeout: 10000 })
    await reloadStartBtn.click()

    await expect(page.locator(`text=${PREVIEW_CONTENT}`)).toBeVisible()
    await expect(page.locator(`text=${SECRET_CONTENT}`)).toBeVisible()
    await expect(gate1).not.toBeVisible()
  })
})
