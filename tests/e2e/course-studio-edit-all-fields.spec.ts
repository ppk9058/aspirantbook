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

test.describe("Real Studio UI Edit-After-Create Verification", () => {
  test.setTimeout(180_000)

  let nonce: string
  let adminUser: any
  let testCourse: any

  test.beforeAll(async () => {
    await prisma.$connect()
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin-edit")
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: new Date() },
    })

    const courseSlug = `base-studio-edit-${slugFor(nonce)}`
    // Create a base published course with full relations to edit in Studio
    testCourse = await prisma.course.create({
      data: {
        title: `Base Initial Title ${nonce}`,
        slug: courseSlug,
        description: "Initial description for real edit-after-create UI verification",
        price: 999,
        originalPrice: 1999,
        technology: "UPSC",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        schemaVersion: 2,
        metadataJson: JSON.stringify({
          schemaVersion: 2,
          goalLabel: "Initial Target Goal",
          enrollCtaLabel: "Enroll in Initial Batch",
          badges: [{ label: "Initial Feature Badge", labelHi: "प्रारंभिक फीचर बैज" }],
          heroMetrics: [{ label: "Initial Mentors", value: "10+" }],
          teachers: [
            {
              id: "t-init-1",
              name: "Initial Faculty Mentor",
              role: "Head of General Studies",
              isPrimary: true,
            },
          ],
          faqs: [
            {
              question: "Initial FAQ Question?",
              answer: "Initial answer text explaining course details.",
            },
          ],
          syllabusPapers: [
            {
              id: "paper-init-1",
              title: "Initial Syllabus Paper One",
              key: "GS1",
              sections: [{ title: "Ancient & Medieval History" }],
            },
          ],
          theme: {
            gold: "#F59E0B",
          },
          tabsConfig: [
            { id: "overview", label: "Overview", enabled: true },
            { id: "lectures", label: "Lectures", enabled: true },
            { id: "syllabus", label: "Syllabus", enabled: true },
          ],
        }),
        units: {
          create: [
            {
              title: "Initial Unit Title",
              order: 1,
            },
          ],
        },
        chapters: {
          create: [
            {
              title: "Initial Theme Title",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Initial Lecture Title",
                    type: "VIDEO",
                    order: 1,
                    duration: 45,
                    isTrial: false,
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        chapters: true,
      },
    })
    // Link chapter to unit so unit has themes and is rendered on public page
    const unitRow = await prisma.courseUnit.findFirst({ where: { courseId: testCourse.id } })
    if (unitRow && testCourse.chapters[0]) {
      await prisma.chapter.update({
        where: { id: testCourse.chapters[0].id },
        data: { unitId: unitRow.id },
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

  test("Edits course via Studio UI across all major fields, saves, and asserts public page updates", async ({ page }) => {
    // Automatically accept any confirmation dialogs (e.g. 0 lectures or unsaved guard)
    page.on("dialog", (dialog) => dialog.accept())

    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])

    // 1. Navigate to Studio Editor
    await page.goto(`/admin/courses/${testCourse.id}/edit`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator('[data-testid="btn-save-course"]')).toBeVisible()

    const EDITED_TITLE = `Edited Studio Title ${nonce}`
    const EDITED_SUBTITLE = `Edited Subtitle with Comprehensive Notes ${nonce}`
    const EDITED_GOAL = `Edited Target Goal ${nonce}`
    const EDITED_CTA = `Join Edited Batch Now`
    const EDITED_STAT_LBL = `Live Expert Hours`
    const EDITED_BADGE_LBL = `Verified Course Badge`
    const EDITED_UNIT_TITLE = `Edited Unit Foundation ${nonce}`
    const EDITED_THEME_TITLE = `Edited Theme Polity ${nonce}`
    const EDITED_LECTURE_TITLE = `Edited Lecture Preamble ${nonce}`
    const EDITED_PAPER_NAME = `Edited Paper General Studies ${nonce}`
    const EDITED_TAB_LABEL = `Custom Curriculum Tab ${nonce}`
    const EDITED_TEACHER_NAME = `Dr. Vikramaditya ${nonce}`
    const EDITED_TEACHER_ROLE = `Distinguished Polity Lead ${nonce}`
    const EDITED_FAQ_QUESTION = `How do I download notes for ${nonce}?`

    // 2. Edit Hero & Details Tab fields
    await page.locator("#hero-title").fill(EDITED_TITLE)
    await page.locator("#hero-subtitle").fill(EDITED_SUBTITLE)
    await page.locator("#hero-goal-label").fill(EDITED_GOAL)
    await page.locator("#hero-cta-en").fill(EDITED_CTA)

    // Edit Stat metric
    const statLbl = page.locator("#metric-lbl-0")
    if (await statLbl.isVisible()) {
      await statLbl.fill(EDITED_STAT_LBL)
    }

    // Edit Badge
    const badgeLbl = page.locator("#badge-lbl-0")
    if (await badgeLbl.isVisible()) {
      await badgeLbl.fill(EDITED_BADGE_LBL)
    }

    // 3. Edit Pricing
    const sellingPrice = page.locator('input[aria-label="Selling Price"]')
    await sellingPrice.fill("1799")
    const mrpPrice = page.locator('input[aria-label="Original Price / MRP"]')
    await mrpPrice.fill("3499")

    // 4. Edit Course Plan (Unit Title)
    await page.locator('button:has-text("Course Plan")').click()
    const unitTitleInput = page.locator("#edit-unit-title-0")
    await expect(unitTitleInput).toBeVisible({ timeout: 15000 })
    const [patchRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/units") && res.request().method() === "PATCH"),
      unitTitleInput.fill(EDITED_UNIT_TITLE),
    ])
    expect(patchRes.status()).toBe(200)
    await page.waitForTimeout(500)

    // 5. Edit Syllabus & Lectures (Theme & Lecture Title, Lecture Date/Time, Free-Preview Toggle)
    await page.locator('button:has-text("Syllabus & Lectures")').click()
    const editSectionBtn = page.locator('button:has-text("Edit Section")').first()
    if (await editSectionBtn.isVisible()) {
      await editSectionBtn.click()
      await page.locator('input[placeholder="Section Title"]').fill(EDITED_THEME_TITLE)
      await page.locator('button[type="submit"]:has-text("Save Section Title")').click()
      await page.waitForTimeout(400)
    }

    // Edit Lesson (Title, Free Preview Toggle, Scheduled Date/Time)
    const editLessonBtn = page.locator('[data-testid="btn-edit-lesson"]').first()
    if (await editLessonBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editLessonBtn.click()
      const lessonTitleInput = page.locator('input[placeholder="e.g. Introduction to Indian Economy"]')
      if (await lessonTitleInput.isVisible()) {
        await lessonTitleInput.fill(EDITED_LECTURE_TITLE)
      }
      // Toggle Free Preview
      const trialCheckbox = page.locator('[data-testid="input-lesson-is-trial"]')
      if (await trialCheckbox.isVisible()) {
        await trialCheckbox.check()
      }
      // Set Lecture Scheduled Date/Time
      const scheduledInput = page.locator('[data-testid="input-lesson-scheduled-at"]')
      if (await scheduledInput.isVisible()) {
        await scheduledInput.fill("2027-04-15T18:30")
      }
      const [lessonSaveRes] = await Promise.all([
        page.waitForResponse((res) => res.url().includes("/lessons") && res.request().method() === "PUT"),
        page.locator('[data-testid="btn-save-edit-lesson"]').click(),
      ])
      expect(lessonSaveRes.status()).toBe(200)
      await page.waitForTimeout(500)
    }

    // 6. Edit Exam Syllabus (Paper Name)
    await page.locator('button:has-text("Exam Syllabus")').click()
    const paperTitleInput = page.locator("#paper-title")
    const paperKeyInput = page.locator("#paper-key")
    if (await paperTitleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (await paperKeyInput.isVisible()) {
        await paperKeyInput.fill(`GS-${nonce.slice(0, 4)}`)
      }
      await paperTitleInput.fill(EDITED_PAPER_NAME)
      await page.locator('button:has-text("Add paper")').click()
      await page.waitForTimeout(400)
    }

    // 7. Edit Nav Tabs (Tab Order / Label)
    await page.locator('button:has-text("Nav Tabs")').click()
    const moveDownBtn = page.locator('[data-testid="btn-move-tab-down-0"]')
    if (await moveDownBtn.isVisible()) {
      await moveDownBtn.click()
      await page.waitForTimeout(300)
    }
    const tabLabelInput = page.locator('[data-testid="tab-label-en-0"]')
    if (await tabLabelInput.isVisible()) {
      await tabLabelInput.fill(EDITED_TAB_LABEL)
    }

    // 8. Edit Visual Theme Color
    await page.locator('button:has-text("Theme & Colors")').click()
    const themeGold = page.locator('[data-testid="theme-color-gold"]')
    if (await themeGold.isVisible()) {
      await themeGold.fill("#ff9900")
    }

    // 9. Edit Faculty & Teachers
    await page.locator('button:has-text("Faculty & Teachers")').click()
    const teacherNameInput = page.locator('[data-testid="input-teacher-name-0"]')
    if (await teacherNameInput.isVisible()) {
      await teacherNameInput.fill(EDITED_TEACHER_NAME)
    }
    const teacherRoleInput = page.locator('[data-testid="input-teacher-role-0"]')
    if (await teacherRoleInput.isVisible()) {
      await teacherRoleInput.fill(EDITED_TEACHER_ROLE)
    }

    // 10. Edit FAQs & Support
    await page.locator('button:has-text("FAQs & Support")').click()
    const faqInput = page.locator('[data-testid="input-faq-question-0"]')
    if (await faqInput.isVisible()) {
      await faqInput.fill(EDITED_FAQ_QUESTION)
    }

    // 11. Save Course in Studio UI
    const saveBtn = page.locator('[data-testid="btn-save-course"]')
    const [saveRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/admin/courses/") && res.request().method() === "PUT"),
      saveBtn.click(),
    ])
    expect(saveRes.status()).toBe(200)
    await page.waitForTimeout(500)

    // 12. Visit Public Page and assert all edited values appear — ONE ASSERTION PER FIELD
    await page.goto(`/courses/${testCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(600)

    const publicContent = await page.textContent("body")

    // Field 1: Title
    expect(publicContent).toContain(EDITED_TITLE)
    // Field 2: Subtitle
    expect(publicContent).toContain(EDITED_SUBTITLE)
    // Field 3: Goal Label
    expect(publicContent).toContain(EDITED_GOAL)
    // Field 4: CTA Button Label
    expect(publicContent).toContain(EDITED_CTA)
    // Field 5: Selling Price
    expect(publicContent).toContain("1,799")
    // Field 6: Original / MRP Price
    expect(publicContent).toContain("3,499")
    // Field 7: Stat Metric
    expect(publicContent).toContain(EDITED_STAT_LBL)
    // Field 8: Badge Label
    expect(publicContent).toContain(EDITED_BADGE_LBL)
    // Field 9: Unit Title
    expect(publicContent).toContain(EDITED_UNIT_TITLE)
    // Field 10: Theme / Chapter Title
    expect(publicContent).toContain(EDITED_THEME_TITLE)
    // Field 11: Syllabus Paper Name
    expect(publicContent).toContain(EDITED_PAPER_NAME)
    // Field 12: Nav Tab Label
    expect(publicContent).toContain(EDITED_TAB_LABEL)
    // Field 13: Faculty Teacher Name
    expect(publicContent).toContain(EDITED_TEACHER_NAME)
    // Field 14: Faculty Teacher Role
    expect(publicContent).toContain(EDITED_TEACHER_ROLE)
    // Field 15: FAQ Question
    expect(publicContent).toContain(EDITED_FAQ_QUESTION)

    // Field 16: Lecture Scheduled Date/Time
    const scheduledTimeEl = page.locator('[data-testid="lecture-scheduled-time"]')
    await expect(scheduledTimeEl).toBeVisible()
    const scheduledText = await scheduledTimeEl.textContent()
    expect(scheduledText).toContain("2027")

    // Field 17: Free Preview Toggle
    const freePreviewBadge = page.locator('[data-testid="badge-free-preview"]')
    await expect(freePreviewBadge).toBeVisible()
    await expect(freePreviewBadge).toHaveText(/Free Preview|फ्री प्रीव्यू/)

    // Field 18: Tab Order (Tab was reordered)
    const subnavTabs = page.locator('nav[aria-label="Course section navigation"] [role="tab"]')
    const firstTabTestId = await subnavTabs.first().getAttribute("data-testid")
    expect(firstTabTestId).not.toBe("subnav-tab-overview")

    // Field 19: Theme Color
    const rootEl = page.locator('[data-testid="course-detail-v2"]')
    const customGold = await rootEl.evaluate((el) => el.style.getPropertyValue("--cd-gold"))
    expect(customGold.toLowerCase()).toBe("#ff9900")
  })
})
