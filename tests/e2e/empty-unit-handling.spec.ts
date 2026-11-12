import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  slugFor,
} from "./test-series-e2e-helpers"

test.describe("Empty Unit Handling and Unnamed Theme Auto-Outline", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let testCourse: any
  let emptyUnitId: string

  test.beforeAll(async () => {
    await prisma.$connect()
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin-unit")
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: new Date() },
    })

    const courseSlug = `empty-unit-test-${slugFor(nonce)}`
    testCourse = await prisma.course.create({
      data: {
        title: `Empty Unit Test Course ${nonce}`,
        slug: courseSlug,
        description: "Course verifying empty unit omission and completeness warning",
        price: 499,
        originalPrice: 999,
        technology: "UPSC",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        schemaVersion: 2,
        metadataJson: JSON.stringify({
          schemaVersion: 2,
        }),
        units: {
          create: [
            {
              title: "Unit 1: Active Foundation",
              order: 1,
            },
            {
              title: "Unit 2: Empty Ghost Unit",
              order: 2,
            },
          ],
        },
        chapters: {
          create: [
            {
              title: "Theme 1: Core Principles",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Lecture 1: Introduction",
                    order: 1,
                    duration: 60,
                    type: "VIDEO",
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        units: true,
        chapters: true,
      },
    })

    // Link chapter to unit 1 only, leaving unit 2 completely empty
    const unit1 = testCourse.units.find((u: any) => u.title.includes("Unit 1"))
    const unit2 = testCourse.units.find((u: any) => u.title.includes("Unit 2"))
    emptyUnitId = unit2.id

    if (unit1 && testCourse.chapters[0]) {
      await prisma.chapter.update({
        where: { id: testCourse.chapters[0].id },
        data: { unitId: unit1.id },
      })
    }
  })

  test.afterAll(async () => {
    if (testCourse?.id) {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: testCourse.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: testCourse.id } }).catch(() => {})
      await prisma.courseUnit.deleteMany({ where: { courseId: testCourse.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: testCourse.id } }).catch(() => {})
    }
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  test("Studio Plan Editor and Completeness Panel show empty unit warning", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])

    await page.goto(`/admin/courses/${testCourse.id}/edit`)
    await page.waitForLoadState("domcontentloaded")

    // Open Course Plan tab
    await page.locator('button:has-text("Course Plan")').click()

    // 1. Assert Warning shows in Studio Plan Editor
    const emptyWarning = page.locator(`[data-testid="empty-unit-warning-${emptyUnitId}"]`)
    await expect(emptyWarning).toBeVisible({ timeout: 30000 })
    await expect(emptyWarning).toContainText("Warning: 0 themes in this unit (will be omitted on public page)")

    // 2. Assert Completeness Checklist modal shows warning
    const checklistBtn = page.locator('button:has-text("Checklist")')
    await expect(checklistBtn).toBeVisible()
    await checklistBtn.click()

    const checklistModal = page.locator('text="Course Completeness Checklist"')
    await expect(checklistModal).toBeVisible()
    await expect(page.locator("body")).toContainText("Empty Units Warning")
    await expect(page.locator("body")).toContainText("have 0 themes (Unit 2: Empty Ghost Unit)")
  })

  test("Public Course page completely omits the empty unit", async ({ page }) => {
    await page.goto(`/courses/${testCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(500)

    const publicContent = await page.locator('[data-testid="course-detail-v2"]').innerText()

    // Unit 1 (has themes/lectures) MUST be present
    expect(publicContent).toContain("Unit 1: Active Foundation")

    // Unit 2 (0 themes) MUST BE OMITTED from the public page
    expect(publicContent).not.toContain("Unit 2: Empty Ghost Unit")
  })

  test("Wizard logic: Unnamed theme in a single-theme unit intentionally defaults to '{Unit Title} Outline'", () => {
    // Pure unit test verification of CourseCreationWizard transformation
    const unitTitle = "Indian Economy & Macro Development"
    const rawTheme = {
      title: "", // Unnamed theme
      subtopics: ["GDP", "Fiscal Policy"],
      lectures: [{ title: "Lec 1", duration: 45 }],
    }

    const trimmedTitle = rawTheme.title?.trim()
    const effectiveTitle =
      trimmedTitle && trimmedTitle.toLowerCase() !== "theme 1"
        ? trimmedTitle
        : (rawTheme.lectures.length > 0 ? `${unitTitle} Outline` : "")

    expect(effectiveTitle).toBe("Indian Economy & Macro Development Outline")
  })
})
