import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { prisma } from "@/lib/prisma"
import { getCourseLesson } from "@/lib/services/courses.service"
import type { Viewer } from "@/lib/api/v1/viewer"

/**
 * B13: GET /api/v1/courses/:id/lessons/:lessonId loaded the whole course (every
 * chapter and every lesson body) and then wrote to Progress on what is a read.
 * The write ran before the access check, so a locked lesson still created a
 * progress row, and every read bumped `lastAccessed`. Missing media was replaced
 * with a public sample video and missing duration with "10 mins".
 *
 * These tests pin the read-only behaviour and the real values.
 */

const nonce = `b13-${Date.now()}`

const viewerFor = (userId: string | null): Viewer => ({
  userId,
  email: userId ? `${nonce}@example.test` : null,
  name: null,
  role: "FREE",
  isGuest: !userId,
  authMethod: userId ? "cookie" : "guest",
})

describe("B13 getCourseLesson is a narrow, read-only query", () => {
  let userId = ""
  let freeCourseId = ""
  let freeCourseSlug = ""
  let premiumCourseId = ""
  let premiumCourseSlug = ""
  let otherCourseId = ""
  let otherLessonId = ""
  let firstLessonId = ""
  let secondLessonId = ""
  let thirdLessonId = ""
  let premiumLessonId = ""
  let trialLessonId = ""

  before(async () => {
    await prisma.$connect()

    const user = await prisma.user.create({
      data: { email: `${nonce}@example.test`, name: "B13 Viewer" },
      select: { id: true },
    })
    userId = user.id

    const freeCourse = await prisma.course.create({
      data: {
        title: `B13 free ${nonce}`,
        slug: `${nonce}-free`,
        description: "free course",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isPremium: false,
      },
      select: { id: true, slug: true },
    })
    freeCourseId = freeCourse.id
    freeCourseSlug = freeCourse.slug

    const premiumCourse = await prisma.course.create({
      data: {
        title: `B13 premium ${nonce}`,
        slug: `${nonce}-premium`,
        description: "premium course",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isPremium: true,
        price: 999,
      },
      select: { id: true, slug: true },
    })
    premiumCourseId = premiumCourse.id
    premiumCourseSlug = premiumCourse.slug

    const otherCourse = await prisma.course.create({
      data: {
        title: `B13 other ${nonce}`,
        slug: `${nonce}-other`,
        description: "other course",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
      },
      select: { id: true },
    })
    otherCourseId = otherCourse.id

    const [chapterOne, chapterTwo, premiumChapter, otherChapter] = await Promise.all([
      prisma.chapter.create({
        data: { title: "Chapter One", order: 1, courseId: freeCourseId },
        select: { id: true },
      }),
      prisma.chapter.create({
        data: { title: "Chapter Two", order: 2, courseId: freeCourseId },
        select: { id: true },
      }),
      prisma.chapter.create({
        data: { title: "Premium", order: 1, courseId: premiumCourseId },
        select: { id: true },
      }),
      prisma.chapter.create({
        data: { title: "Other", order: 1, courseId: otherCourseId },
        select: { id: true },
      }),
    ])

    const [first, second, third, premium, trial, other] = await Promise.all([
      prisma.lesson.create({
        data: { title: "First lesson", type: "READING", order: 1, chapterId: chapterOne.id },
        select: { id: true },
      }),
      prisma.lesson.create({
        data: {
          title: "Second lesson",
          type: "VIDEO",
          order: 2,
          chapterId: chapterOne.id,
          videoUrl: null,
          duration: null,
          durationText: null,
        },
        select: { id: true },
      }),
      prisma.lesson.create({
        data: {
          title: "Third lesson",
          type: "READING",
          order: 1,
          chapterId: chapterTwo.id,
          duration: 25,
        },
        select: { id: true },
      }),
      prisma.lesson.create({
        data: { title: "Premium lesson", type: "VIDEO", order: 1, chapterId: premiumChapter.id },
        select: { id: true },
      }),
      prisma.lesson.create({
        data: {
          title: "Trial lesson",
          type: "VIDEO",
          order: 2,
          chapterId: premiumChapter.id,
          isTrial: true,
        },
        select: { id: true },
      }),
      prisma.lesson.create({
        data: { title: "Other lesson", type: "READING", order: 1, chapterId: otherChapter.id },
        select: { id: true },
      }),
    ])

    firstLessonId = first.id
    secondLessonId = second.id
    thirdLessonId = third.id
    premiumLessonId = premium.id
    trialLessonId = trial.id
    otherLessonId = other.id
  })

  after(async () => {
    await prisma.progress.deleteMany({ where: { userId } })
    await prisma.lesson.deleteMany({
      where: { chapter: { courseId: { in: [freeCourseId, premiumCourseId, otherCourseId] } } },
    })
    await prisma.chapter.deleteMany({
      where: { courseId: { in: [freeCourseId, premiumCourseId, otherCourseId] } },
    })
    await prisma.course.deleteMany({
      where: { id: { in: [freeCourseId, premiumCourseId, otherCourseId] } },
    })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it("does not create progress when a lesson is opened", async () => {
    const before = await prisma.progress.count({ where: { userId } })

    await getCourseLesson(viewerFor(userId), freeCourseSlug, firstLessonId)

    const after = await prisma.progress.count({ where: { userId } })
    assert.equal(after, before, "GET must not insert a Progress row")
  })

  it("does not bump lastAccessed on an existing progress row", async () => {
    const lastAccessed = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    await prisma.progress.create({
      data: { userId, lessonId: secondLessonId, completed: true, timeSpent: 120, lastAccessed },
    })

    const lesson = await getCourseLesson(viewerFor(userId), freeCourseSlug, secondLessonId)
    assert.equal(lesson.isCompleted, true, "the existing completion is reported")

    const stored = await prisma.progress.findUnique({
      where: { userId_lessonId: { userId, lessonId: secondLessonId } },
      select: { lastAccessed: true, timeSpent: true },
    })
    assert.equal(stored?.lastAccessed.getTime(), lastAccessed.getTime(), "lastAccessed must be unchanged")
    assert.equal(stored?.timeSpent, 120)
  })

  it("does not create progress for a locked lesson", async () => {
    const before = await prisma.progress.count({ where: { userId } })

    await assert.rejects(
      () => getCourseLesson(viewerFor(userId), premiumCourseSlug, premiumLessonId),
      /FORBIDDEN: Lesson is locked/
    )

    const after = await prisma.progress.count({ where: { userId } })
    assert.equal(after, before, "a rejected locked lesson must not leak a progress row")
  })

  it("allows a trial lesson in a premium course without writing progress", async () => {
    const before = await prisma.progress.count({ where: { userId } })
    const lesson = await getCourseLesson(viewerFor(userId), premiumCourseSlug, trialLessonId)
    assert.equal(lesson.id, trialLessonId)
    assert.equal(await prisma.progress.count({ where: { userId } }), before)
  })

  it("returns null media and duration instead of a sample video and 10 mins", async () => {
    const lesson = await getCourseLesson(viewerFor(userId), freeCourseSlug, secondLessonId)

    assert.equal(lesson.videoUrl, null, "a lesson without a video must not get a sample URL")
    assert.equal(lesson.durationText, null, "a lesson without a duration must not claim 10 mins")

    const timed = await getCourseLesson(viewerFor(userId), freeCourseSlug, thirdLessonId)
    assert.equal(timed.durationText, "25 mins", "a real duration is still formatted")
  })

  it("keeps course-wide prev/next navigation across chapters", async () => {
    const first = await getCourseLesson(viewerFor(userId), freeCourseSlug, firstLessonId)
    const second = await getCourseLesson(viewerFor(userId), freeCourseSlug, secondLessonId)
    const third = await getCourseLesson(viewerFor(userId), freeCourseSlug, thirdLessonId)

    assert.deepEqual(first.navigation, { prevLessonId: null, nextLessonId: secondLessonId })
    assert.deepEqual(second.navigation, {
      prevLessonId: firstLessonId,
      nextLessonId: thirdLessonId,
    })
    assert.deepEqual(third.navigation, { prevLessonId: secondLessonId, nextLessonId: null })
    assert.equal(third.chapterTitle, "Chapter Two")
  })

  it("rejects a lesson that belongs to a different course", async () => {
    await assert.rejects(
      () => getCourseLesson(viewerFor(null), freeCourseSlug, otherLessonId),
      /NOT_FOUND: Lesson not found/
    )
  })

  it("reports an unknown or unpublished course as not found", async () => {
    await assert.rejects(
      () => getCourseLesson(viewerFor(null), `${nonce}-missing`, firstLessonId),
      /NOT_FOUND: Course not found/
    )
  })
})
