import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import { createActor, loginAs, newNonce, prisma, slugFor } from "./test-series-e2e-helpers"

/**
 * B-017 regression: the lesson screen (`LessonViewer`) had stale hook
 * dependencies; marking a reading lesson complete is driven by the scroll
 * tracker whose `handleMarkComplete` was a missing dependency. The screen must
 * still render real lesson content and expose the completion control.
 */
test.describe("B-017: lesson viewer renders the real lesson", () => {
  test.setTimeout(120_000)

  let nonce = ""
  let courseSlug = ""
  let courseId = ""
  let lessonId = ""
  let email = ""

  test.beforeAll(async () => {
    nonce = newNonce()
    const student = await createActor(nonce, "FREE", "lesson-viewer")
    email = student.email

    courseSlug = `${slugFor(nonce)}-lesson-course`
    const course = await prisma.course.create({
      data: {
        title: `${nonce} Lesson Course`,
        slug: courseSlug,
        description: "Fixture course for the lesson viewer regression",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isPremium: false,
        chapters: {
          create: [
            {
              title: "Chapter 1",
              order: 1,
              lessons: {
                create: [
                  {
                    title: `${nonce} Reading Lesson`,
                    order: 1,
                    type: "READING",
                    content: "B-017 fixture lesson body.",
                  },
                ],
              },
            },
          ],
        },
      },
      include: { chapters: { include: { lessons: true } } },
    })
    courseId = course.id
    lessonId = course.chapters[0].lessons[0].id

    await prisma.enrollment.create({ data: { userId: student.id, courseId } })
  })

  test.afterAll(async () => {
    try {
      await prisma.progress.deleteMany({ where: { lessonId } })
      await prisma.enrollment.deleteMany({ where: { courseId } })
      await prisma.lesson.delete({ where: { id: lessonId } })
      await prisma.chapter.deleteMany({ where: { courseId } })
      await prisma.course.delete({ where: { id: courseId } })
      await prisma.user.deleteMany({ where: { email } })
    } catch (error) {
      console.error("[lesson-viewer] cleanup failed", error)
    }
  })

  test("renders the lesson content and the complete control", async ({ page }) => {
    await loginAs(page, email)

    const response = await page.goto(`/learn/${courseSlug}/${lessonId}`)
    expect(response?.status()).toBe(200)

    await expect(page.getByText("B-017 fixture lesson body.").first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole("heading", { name: `${nonce} Reading Lesson` }).first()).toBeVisible()

    const complete = page.getByRole("button", { name: /mark.*complete|complete.*lesson/i }).first()
    await expect(complete).toBeVisible()
  })
})
