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

test.describe("Prisma Teacher Store: Multi-Course Attachment and Live Sync", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let teacherId: string
  let courseA: any
  let courseB: any

  test.beforeAll(async () => {
    await prisma.$connect()
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin-teacher")
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: new Date() },
    })

    // 1. Create a central Teacher record in the database
    const initialTeacher = await prisma.teacher.create({
      data: {
        name: `Faculty Alpha ${nonce}`,
        nameHi: `संकाय अल्फा ${nonce}`,
        role: "Senior Civil Services Mentor",
        roleHi: "वरिष्ठ सिविल सेवा मेंटर",
        bio: `Initial central bio for teacher testing ${nonce}`,
        credentials: [{ label: "10+ Yrs Mentorship" }, { label: "AIR 23" }],
      },
    })
    teacherId = initialTeacher.id

    // 2. Create Course A and link the central teacher
    courseA = await prisma.course.create({
      data: {
        title: `Course Alpha GS ${nonce}`,
        slug: `course-alpha-${slugFor(nonce)}`,
        description: "Course Alpha to verify central teacher multi-course sync",
        price: 999,
        originalPrice: 1999,
        technology: "UPSC",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        schemaVersion: 2,
        metadataJson: JSON.stringify({
          schemaVersion: 2,
          units: [{ id: "u1", title: "Unit 1", order: 1 }],
        }),
        units: {
          create: [{ title: "Unit 1", order: 1 }],
        },
        chapters: {
          create: [
            {
              title: "Theme 1",
              order: 1,
              lessons: {
                create: [{ title: "Lecture 1", order: 1, duration: 45, type: "VIDEO" }],
              },
            },
          ],
        },
        teachers: {
          create: [
            {
              teacherId,
              isPrimary: true,
              order: 0,
            },
          ],
        },
      },
    })

    // 3. Create Course B and link the same central teacher
    courseB = await prisma.course.create({
      data: {
        title: `Course Beta Optional ${nonce}`,
        slug: `course-beta-${slugFor(nonce)}`,
        description: "Course Beta to verify central teacher multi-course sync",
        price: 1499,
        originalPrice: 2999,
        technology: "State PSC",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        schemaVersion: 2,
        metadataJson: JSON.stringify({
          schemaVersion: 2,
          units: [{ id: "u1", title: "Unit 1", order: 1 }],
        }),
        units: {
          create: [{ title: "Unit 1", order: 1 }],
        },
        chapters: {
          create: [
            {
              title: "Theme 1",
              order: 1,
              lessons: {
                create: [{ title: "Lecture 1", order: 1, duration: 45, type: "VIDEO" }],
              },
            },
          ],
        },
        teachers: {
          create: [
            {
              teacherId,
              isPrimary: true,
              order: 0,
            },
          ],
        },
      },
    })
  })

  test.afterAll(async () => {
    // Teardown test courses and test teacher
    if (courseA?.id) {
      await prisma.courseTeacher.deleteMany({ where: { courseId: courseA.id } }).catch(() => {})
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: courseA.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: courseA.id } }).catch(() => {})
      await prisma.courseUnit.deleteMany({ where: { courseId: courseA.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: courseA.id } }).catch(() => {})
    }
    if (courseB?.id) {
      await prisma.courseTeacher.deleteMany({ where: { courseId: courseB.id } }).catch(() => {})
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: courseB.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: courseB.id } }).catch(() => {})
      await prisma.courseUnit.deleteMany({ where: { courseId: courseB.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: courseB.id } }).catch(() => {})
    }
    if (teacherId) {
      await prisma.teacher.delete({ where: { id: teacherId } }).catch(() => {})
    }
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  test("Initial verification: Both Course A and Course B show initial teacher name", async ({ page }) => {
    // 1. Visit Course A public page
    await page.goto(`/courses/${courseA.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("body")).toContainText(`Faculty Alpha ${nonce}`)

    // 2. Visit Course B public page
    await page.goto(`/courses/${courseB.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("body")).toContainText(`Faculty Alpha ${nonce}`)
  })

  test("Edit central teacher in Admin UI once, and assert BOTH course pages update", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])

    // Navigate to central teacher admin store
    await page.goto("/admin/courses/teachers")
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("h1")).toContainText("Central Faculty & Teacher Store")

    // Click edit on the target teacher
    const editBtn = page.locator(`[data-testid="btn-edit-teacher-${teacherId}"]`)
    await expect(editBtn).toBeVisible({ timeout: 15000 })
    await editBtn.click()

    const UPDATED_TEACHER_NAME = `Dr. Vikramaditya Rathore ${nonce}`
    const UPDATED_TEACHER_ROLE = `Chief Academic Mentor ${nonce}`
    const UPDATED_BIO = `Updated central bio: Mentored 150+ Top 100 rankers ${nonce}`

    const nameInput = page.locator('[data-testid="input-admin-teacher-name"]')
    await expect(nameInput).toBeVisible()
    await nameInput.fill(UPDATED_TEACHER_NAME)

    const roleInput = page.locator('[data-testid="input-admin-teacher-role"]')
    await roleInput.fill(UPDATED_TEACHER_ROLE)

    const bioInput = page.locator('[data-testid="input-admin-teacher-bio"]')
    await bioInput.fill(UPDATED_BIO)

    // Save teacher
    const [saveRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/admin/teachers") && res.request().method() === "POST"),
      page.locator('[data-testid="btn-save-teacher"]').click(),
    ])
    expect(saveRes.status()).toBe(200)
    await expect(page.locator('text="Teacher saved and attached successfully!"')).toBeVisible()

    // 3. Assert Course A public page reflects the updated teacher profile
    await page.goto(`/courses/${courseA.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(500)
    const courseABody = await page.textContent("body")
    expect(courseABody).toContain(UPDATED_TEACHER_NAME)
    expect(courseABody).toContain(UPDATED_TEACHER_ROLE)

    // 4. Assert Course B public page ALSO reflects the updated teacher profile
    await page.goto(`/courses/${courseB.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(500)
    const courseBBody = await page.textContent("body")
    expect(courseBBody).toContain(UPDATED_TEACHER_NAME)
    expect(courseBBody).toContain(UPDATED_TEACHER_ROLE)
  })
})
