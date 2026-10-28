import { test, expect } from "@playwright/test"
import {
  prisma,
  createActor,
  loginAs,
  newNonce,
  cleanupNonce,
} from "./test-series-e2e-helpers"

/**
 * A9: tutorial import hardening.
 *
 * The legacy import path used to (a) mark every imported lesson as a free
 * trial, (b) delete the existing curriculum outside a transaction, and (c)
 * default to PUBLISHED while the v1 importer defaults to DRAFT.
 */

const nonce = newNonce()

function legacyPayload(title: string, overrides: Record<string, unknown> = {}) {
  return {
    title,
    technology: "upsc",
    description: "A9 import fixture description long enough to be valid.",
    chapters: [
      { title: "Chapter One", lessons: [{ title: "Lesson One" }] },
      { title: "Chapter Two", lessons: [{ title: "Lesson Two" }] },
    ],
    ...overrides,
  }
}

test.describe("A9 tutorial import hardening", () => {
  test.afterAll(async () => {
    await prisma.course.deleteMany({ where: { slug: { contains: nonce.toLowerCase() } } })
    await cleanupNonce(nonce)
    await prisma.$disconnect()
  })

  test("legacy import defaults to a draft and never makes lessons free trials", async ({ page }) => {
    const admin = await createActor(nonce, "ADMIN", "import-admin")
    await loginAs(page, admin.email)

    const res = await page.request.post("/api/admin/tutorials/import", {
      data: legacyPayload(`A9 Draft Import ${nonce}`),
    })
    expect(res.status(), await res.text()).toBe(201)
    const body = await res.json()

    const course = await prisma.course.findUnique({
      where: { id: body.courseId },
      include: { chapters: { include: { lessons: true } } },
    })
    expect(course).not.toBeNull()
    expect(course?.status).toBe("DRAFT")
    expect(course?.isPublished).toBe(false)
    expect(course?.chapters.length).toBe(2)

    const lessons = course?.chapters.flatMap((c) => c.lessons) || []
    expect(lessons.length).toBe(2)
    for (const lesson of lessons) {
      expect(lesson.isTrial, `lesson ${lesson.title} must not be a free trial`).toBe(false)
    }
  })

  test("a teacher cannot publish through the legacy import path", async ({ page }) => {
    const teacher = await createActor(nonce, "TEACHER", "import-teacher")
    await loginAs(page, teacher.email)

    const res = await page.request.post("/api/admin/tutorials/import", {
      data: legacyPayload(`A9 Teacher Publish ${nonce}`, { status: "PUBLISHED" }),
    })
    expect(res.status(), await res.text()).toBe(201)
    const body = await res.json()

    const course = await prisma.course.findUnique({ where: { id: body.courseId } })
    expect(course?.status).toBe("DRAFT")
    expect(course?.isPublished).toBe(false)
    expect(course?.createdById).toBe(teacher.id)
  })

  test("a failing re-import leaves the existing curriculum intact", async ({ page }) => {
    const admin = await createActor(nonce, "ADMIN", "import-atomic")
    await loginAs(page, admin.email)

    const first = await page.request.post("/api/admin/tutorials/import", {
      data: legacyPayload(`A9 Atomic Import ${nonce}`),
    })
    expect(first.status(), await first.text()).toBe(201)
    const { courseId } = await first.json()

    const before = await prisma.chapter.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: { title: true },
    })
    expect(before.map((c) => c.title)).toEqual(["Chapter One", "Chapter Two"])

    // `duration` is not a number, so the batched insert fails after the delete
    // statement. Only the transaction can bring the deleted chapters back.
    const broken = await page.request.post("/api/admin/tutorials/import", {
      data: legacyPayload(`A9 Atomic Import ${nonce}`, {
        courseId,
        title: `A9 Broken Import ${nonce}`,
        chapters: [
          { title: "Replacement", lessons: [{ title: "Broken lesson", duration: "not-a-number" }] },
        ],
      }),
    })
    expect(broken.status()).toBeGreaterThanOrEqual(400)

    const after = await prisma.chapter.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: { title: true },
    })
    expect(after.map((c) => c.title)).toEqual(["Chapter One", "Chapter Two"])

    const stored = await prisma.course.findUnique({ where: { id: courseId } })
    expect(stored?.title).toBe(`A9 Atomic Import ${nonce}`)
  })

  test("malformed chapter input is rejected before anything is written", async ({ page }) => {
    const admin = await createActor(nonce, "ADMIN", "import-validation")
    await loginAs(page, admin.email)

    const res = await page.request.post("/api/admin/tutorials/import", {
      data: {
        title: `A9 Invalid ${nonce}`,
        technology: "upsc",
        chapters: [{ title: 12345 }],
      },
    })
    expect([400, 422]).toContain(res.status())

    expect(
      await prisma.course.count({ where: { title: `A9 Invalid ${nonce}` } })
    ).toBe(0)
  })
})
