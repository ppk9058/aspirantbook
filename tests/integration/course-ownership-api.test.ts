import { describe, it, before, after } from "node:test"
import * as assert from "node:assert/strict"
import { prisma } from "../../lib/prisma"
import { assertTestDb } from "../../lib/testing/assert-test-db"
import {
  loadManagedCourse,
  requireManagedCourse,
  requireManagedChapter,
  requireManagedLesson,
} from "../../lib/auth/course-access-server"
import type { CourseAccessUser } from "../../lib/auth/course-access"

// Ensure test DB is targeted safely
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL

assertTestDb()

describe("E2E / Integration: Teacher Course Ownership Isolation", () => {
  const runId = `${Date.now()}`
  const teacherA_id = `u_teacher_a_${runId}`
  const teacherB_id = `u_teacher_b_${runId}`
  let courseId = ""
  let chapterId = ""
  let unitId = ""
  let lessonId = ""

  const teacherA: CourseAccessUser = {
    isAuthenticated: true,
    role: "TEACHER",
    userId: teacherA_id,
  }

  const teacherB: CourseAccessUser = {
    isAuthenticated: true,
    role: "TEACHER",
    userId: teacherB_id,
  }

  before(async () => {
    // 1. Seed two distinct teachers in the test DB
    await prisma.user.upsert({
      where: { id: teacherA_id },
      update: {},
      create: {
        id: teacherA_id,
        name: "Teacher Alpha",
        email: `teacher_alpha_${runId}@aspirantbook.com`,
        role: "TEACHER",
      },
    })

    await prisma.user.upsert({
      where: { id: teacherB_id },
      update: {},
      create: {
        id: teacherB_id,
        name: "Teacher Beta",
        email: `teacher_beta_${runId}@aspirantbook.com`,
        role: "TEACHER",
      },
    })

    // 2. Teacher A creates a course
    const course = await prisma.course.create({
      data: {
        title: `Teacher A Course ${runId}`,
        slug: `teacher-a-course-${runId}`,
        description: "Course created by Teacher A",
        difficulty: "BEGINNER",
        createdById: teacherA.userId,
        status: "DRAFT",
        isPublished: false,
      },
    })
    courseId = course.id

    // 3. Teacher A adds a chapter
    const chapter = await prisma.chapter.create({
      data: {
        courseId,
        title: "Chapter 1: Foundations",
        order: 1,
      },
    })
    chapterId = chapter.id

    // 4. Teacher A adds a lesson to the chapter
    const lesson = await prisma.lesson.create({
      data: {
        chapterId,
        title: "Lesson 1: Intro",
        type: "READING",
        order: 1,
      },
    })
    lessonId = lesson.id

    // 5. Teacher A adds a unit
    const unit = await prisma.courseUnit.create({
      data: {
        courseId,
        title: "Unit 1",
        order: 1,
      },
    })
    unitId = unit.id

    // 6. Teacher A adds syllabus paper
    await prisma.courseSyllabusPaper.create({
      data: {
        courseId,
        key: `PAPER-${runId}`,
        title: "General Studies Paper 1",
        order: 1,
        sections: {
          create: [
            {
              title: "Section 1",
              unitId,
              chapterId,
              order: 1,
            },
          ],
        },
      },
    })
  })

  after(async () => {
    // Cleanup created test records
    await prisma.courseSyllabusSection.deleteMany({ where: { chapterId } }).catch(() => {})
    await prisma.courseSyllabusPaper.deleteMany({ where: { courseId } }).catch(() => {})
    await prisma.courseUnit.deleteMany({ where: { courseId } }).catch(() => {})
    await prisma.lesson.deleteMany({ where: { chapterId } }).catch(() => {})
    await prisma.chapter.deleteMany({ where: { courseId } }).catch(() => {})
    await prisma.course.deleteMany({ where: { id: courseId } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: [teacherA_id, teacherB_id] } } }).catch(() => {})
    await prisma.$disconnect()
  })

  it("Teacher A (owner) can manage course, chapter, unit, and lesson", async () => {
    const courseRes = await loadManagedCourse(teacherA, courseId)
    assert.equal("course" in courseRes, true)
    if ("course" in courseRes) {
      assert.equal(courseRes.course.id, courseId)
      assert.equal(courseRes.course.createdById, teacherA.userId)
    }

    const chapterRes = await requireManagedChapter(teacherA, chapterId)
    assert.equal(Boolean(chapterRes.response), false)
    assert.equal(chapterRes.chapterId, chapterId)

    const lessonRes = await requireManagedLesson(teacherA, lessonId)
    assert.equal(Boolean(lessonRes.response), false)
    assert.equal(lessonRes.lessonId, lessonId)
  })

  it("Teacher B (non-owner) gets 403 on Teacher A's course", async () => {
    const courseRes = await loadManagedCourse(teacherB, courseId)
    assert.equal("status" in courseRes, true)
    if ("status" in courseRes) {
      assert.equal(courseRes.status, 403)
      assert.match(courseRes.error, /Access Denied/i)
    }

    const courseRouteRes = await requireManagedCourse(teacherB, courseId)
    assert.ok(courseRouteRes.response)
    assert.equal(courseRouteRes.response.status, 403)

    const body = await courseRouteRes.response.json()
    assert.match(body.error, /Access Denied/i)
  })

  it("Teacher B (non-owner) gets 403 when trying to access Teacher A's chapter", async () => {
    const chapterRes = await requireManagedChapter(teacherB, chapterId)
    assert.ok(chapterRes.response)
    assert.equal(chapterRes.response.status, 403)

    const body = await chapterRes.response.json()
    assert.match(body.error, /Access Denied/i)
  })

  it("Teacher B (non-owner) gets 403 when trying to access Teacher A's lesson", async () => {
    const lessonRes = await requireManagedLesson(teacherB, lessonId)
    assert.ok(lessonRes.response)
    assert.equal(lessonRes.response.status, 403)

    const body = await lessonRes.response.json()
    assert.match(body.error, /Access Denied/i)
  })
})
