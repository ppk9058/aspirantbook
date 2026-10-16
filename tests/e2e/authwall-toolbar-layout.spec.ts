import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, slugFor, loginAs } from "./test-series-e2e-helpers"
import bcrypt from "bcryptjs"

interface Box {
  x: number
  y: number
  width: number
  height: number
}

function intersects(a: Box, b: Box): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

test.describe("SelectedGateToolbar Layout & Overlap Prevention (Desktop + Mobile)", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let course: any
  let lesson: any

  test.beforeAll(async () => {
    nonce = newNonce()
    const passwordHash = await bcrypt.hash(PASSWORD, 10)

    adminUser = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-toolbar-admin@test.local`,
        name: `Admin Toolbar ${nonce}`,
        password: passwordHash,
        role: "ADMIN",
        selectedGoal: "bpsc",
      },
    })

    course = await prisma.course.create({
      data: {
        title: `Toolbar Layout Course ${nonce}`,
        slug: `${slugFor(nonce)}-toolbar-layout-course`,
        description: "Testing gate toolbar layout, no overlapping elements, and scrollWidth <= clientWidth",
        difficulty: "BEGINNER",
        isPublished: true,
        status: "PUBLISHED",
        isGated: true,
        previewPercentage: 100,
        seoMode: "preview",
        chapters: {
          create: [
            {
              title: "Phase 1: Toolbar Foundations",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "1.1 Preview Lesson with 50%",
                    order: 1,
                    type: "READING",
                    gateMode: "preview",
                    previewPercentage: 50,
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        chapters: {
          include: { lessons: true },
        },
      },
    })

    lesson = course.chapters[0].lessons[0]
  })

  test.afterAll(async () => {
    if (course?.id) {
      await prisma.course.delete({ where: { id: course.id } }).catch(() => {})
    }
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
  })

  test("SelectedGateToolbar: bounding boxes of Save, badge, and helper text do not intersect and scrollWidth <= clientWidth", async ({
    page,
  }) => {
    await loginAs(page, adminUser.email)
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    // Initially toolbar should not be visible when no item is selected
    const toolbar = page.locator('[data-testid="selected-gate-toolbar"]')
    await expect(toolbar).toHaveCount(0)

    // Select the lesson in Course Structure
    const lessonRow = page.locator(`[data-testid="lesson-row-${lesson.id}"]`)
    await expect(lessonRow).toBeVisible({ timeout: 15_000 })
    await lessonRow.click()

    // Toolbar must now appear
    await expect(toolbar).toBeVisible({ timeout: 15_000 })

    // Verify toolbar scrollWidth <= clientWidth (no horizontal overflow)
    const { scrollWidth, clientWidth } = await toolbar.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // allow 1px sub-pixel rounding tolerance

    // Locate the three right-hand items
    const saveBtn = toolbar.locator('[data-testid="save-item-gate-btn"]')
    const badge = toolbar.locator('[data-testid="item-gate-mode-badge"]')
    const helper = toolbar.locator('span:has-text("(100% = fully open, 0% = fully locked)")')

    await expect(saveBtn).toBeVisible()
    await expect(badge).toBeVisible()
    await expect(helper).toBeVisible()

    const saveBox = await saveBtn.boundingBox()
    const badgeBox = await badge.boundingBox()
    const helperBox = await helper.boundingBox()

    expect(saveBox).not.toBeNull()
    expect(badgeBox).not.toBeNull()
    expect(helperBox).not.toBeNull()

    // Assert zero intersection between any of the three elements
    const saveBadgeOverlap = intersects(saveBox!, badgeBox!)
    const badgeHelperOverlap = intersects(badgeBox!, helperBox!)
    const saveHelperOverlap = intersects(saveBox!, helperBox!)

    expect(saveBadgeOverlap).toBe(false)
    expect(badgeHelperOverlap).toBe(false)
    expect(saveHelperOverlap).toBe(false)
  })
})
