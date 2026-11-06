import test, { describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../lib/prisma"
import { loadManagedCourse } from "../../lib/auth/course-access-server"
import type { CourseAccessUser } from "../../lib/auth/course-access"

describe("loadManagedCourse ownership & access policy", () => {
  const originalFindUnique = prisma.course.findUnique

  afterEach(() => {
    prisma.course.findUnique = originalFindUnique
  })

  const dummyCourse = {
    id: "course-123",
    title: "Test Course",
    slug: "test-course",
    status: "DRAFT",
    isPublished: false,
    enrollmentCount: 0,
    createdById: "teacher-owner",
    thumbnailUrl: null,
    metadataJson: null,
    _count: { enrollments: 0 },
  }

  test("ADMIN ok: admin can manage any course", async () => {
    prisma.course.findUnique = (async () => ({ ...dummyCourse })) as any

    const adminUser: CourseAccessUser = {
      isAuthenticated: true,
      role: "ADMIN",
      userId: "admin-user-1",
    }

    const res = await loadManagedCourse(adminUser, "course-123")
    assert.equal("course" in res, true)
    if ("course" in res) {
      assert.equal(res.course.id, "course-123")
      assert.equal(res.course.createdById, "teacher-owner")
    }
  })

  test("TEACHER owner ok: teacher can manage course they created", async () => {
    prisma.course.findUnique = (async () => ({ ...dummyCourse })) as any

    const ownerTeacher: CourseAccessUser = {
      isAuthenticated: true,
      role: "TEACHER",
      userId: "teacher-owner",
    }

    const res = await loadManagedCourse(ownerTeacher, "course-123")
    assert.equal("course" in res, true)
    if ("course" in res) {
      assert.equal(res.course.id, "course-123")
      assert.equal(res.course.createdById, "teacher-owner")
    }
  })

  test("TEACHER non-owner 403: teacher cannot manage course created by someone else", async () => {
    prisma.course.findUnique = (async () => ({ ...dummyCourse })) as any

    const otherTeacher: CourseAccessUser = {
      isAuthenticated: true,
      role: "TEACHER",
      userId: "teacher-other",
    }

    const res = await loadManagedCourse(otherTeacher, "course-123")
    assert.equal("status" in res, true)
    if ("status" in res) {
      assert.equal(res.status, 403)
      assert.match(res.error, /Access Denied/i)
    }
  })

  test("real TEACHER on null-creator course 403: real teacher cannot manage legacy course", async () => {
    prisma.course.findUnique = (async () => ({ ...dummyCourse, createdById: null })) as any

    const realTeacher: CourseAccessUser = {
      isAuthenticated: true,
      role: "TEACHER",
      userId: "teacher-real-456",
    }

    const res = await loadManagedCourse(realTeacher, "course-123")
    assert.equal("status" in res, true)
    if ("status" in res) {
      assert.equal(res.status, 403)
      assert.match(res.error, /Access Denied/i)
    }
  })

  test("demo-teacher on null-creator course ok: demo teacher allowed on legacy course", async () => {
    prisma.course.findUnique = (async () => ({ ...dummyCourse, createdById: null })) as any

    const demoTeacher: CourseAccessUser = {
      isAuthenticated: true,
      role: "TEACHER",
      userId: "demo-teacher",
    }

    const res = await loadManagedCourse(demoTeacher, "course-123")
    assert.equal("course" in res, true)
    if ("course" in res) {
      assert.equal(res.course.id, "course-123")
      assert.equal(res.course.createdById, null)
    }
  })

  test("missing course 404: non-existent course returns 404", async () => {
    prisma.course.findUnique = (async () => null) as any

    const adminUser: CourseAccessUser = {
      isAuthenticated: true,
      role: "ADMIN",
      userId: "admin-user-1",
    }

    const res = await loadManagedCourse(adminUser, "missing-id")
    assert.equal("status" in res, true)
    if ("status" in res) {
      assert.equal(res.status, 404)
      assert.match(res.error, /Course not found/i)
    }
  })
})
