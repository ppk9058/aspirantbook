import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  courseAccessLevel,
  canManageCourse,
  assertCanManageCourse,
  decideCourseDelete,
  creatorIdFor,
} from "../../lib/auth/course-access"

const admin = { isAuthenticated: true, role: "ADMIN", userId: "user-admin" }
const teacherA = { isAuthenticated: true, role: "TEACHER", userId: "user-teacher-a" }
const teacherB = { isAuthenticated: true, role: "TEACHER", userId: "user-teacher-b" }
const student = { isAuthenticated: true, role: "STUDENT", userId: "user-student" }
const demoTeacher = { isAuthenticated: true, role: "TEACHER", userId: "demo-teacher" }

const courseA = { id: "course-a", createdById: "user-teacher-a" }
const courseB = { id: "course-b", createdById: "user-teacher-b" }
const legacyCourse = { id: "course-legacy", createdById: null }

describe("A8 course ownership", () => {
  test("admin can manage every course", () => {
    for (const course of [courseA, courseB, legacyCourse]) {
      assert.equal(canManageCourse(admin, course), true)
      assert.equal(courseAccessLevel(admin, course), "ADMIN")
    }
  })

  test("a teacher can only manage their own course", () => {
    assert.equal(courseAccessLevel(teacherA, courseA), "OWNER")
    assert.equal(canManageCourse(teacherA, courseA), true)

    assert.equal(courseAccessLevel(teacherA, courseB), "DENIED")
    assert.equal(canManageCourse(teacherA, courseB), false)
    assert.equal(canManageCourse(teacherB, courseA), false)
  })

  test("legacy courses without a creator are admin-only for real teachers", () => {
    assert.equal(canManageCourse(teacherA, legacyCourse), false)
    assert.equal(canManageCourse(demoTeacher, legacyCourse), true)
    assert.equal(courseAccessLevel(demoTeacher, legacyCourse), "LEGACY_DEMO")
  })

  test("students and anonymous callers are always denied", () => {
    for (const course of [courseA, legacyCourse]) {
      assert.equal(canManageCourse(student, course), false)
      assert.equal(canManageCourse({ isAuthenticated: false, role: "ADMIN", userId: "x" }, course), false)
      assert.equal(canManageCourse(null, course), false)
    }
  })

  test("missing course or missing user id fails closed", () => {
    assert.equal(canManageCourse(admin, null), false)
    assert.equal(canManageCourse(teacherA, { id: "x", createdById: null }), false)
    assert.equal(
      canManageCourse({ isAuthenticated: true, role: "TEACHER" }, courseA),
      false
    )
  })

  test("assertCanManageCourse distinguishes 401 from 403", () => {
    assert.throws(
      () => assertCanManageCourse({ isAuthenticated: false, role: "TEACHER" }, courseA),
      /^Error: UNAUTHORIZED/
    )
    assert.throws(() => assertCanManageCourse(teacherA, courseB), /^Error: FORBIDDEN/)
    assert.throws(() => assertCanManageCourse(teacherA, null), /^Error: FORBIDDEN/)
    assert.doesNotThrow(() => assertCanManageCourse(teacherA, courseA))
  })

  test("courses with enrollments are archived, never deleted", () => {
    assert.equal(decideCourseDelete(0), "delete")
    assert.equal(decideCourseDelete(1), "archive")
    assert.equal(decideCourseDelete(250), "archive")
  })

  test("demo identities are never persisted as a creator", () => {
    assert.equal(creatorIdFor(teacherA), "user-teacher-a")
    assert.equal(creatorIdFor(demoTeacher), null)
    assert.equal(creatorIdFor({ ...teacherA, userId: undefined }), null)
  })
})
