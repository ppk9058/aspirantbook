import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { isCourseVisibleToUser } from "../../lib/courses/visibility"

const teacherA = "user-teacher-a"
const teacherB = "user-teacher-b"

const draftOwnedByA = {
  status: "DRAFT",
  isPublished: false,
  createdById: teacherA,
}

const publishedOwnedByA = {
  status: "PUBLISHED",
  isPublished: true,
  createdById: teacherA,
}

const draftWithoutOwner = {
  status: "DRAFT",
  isPublished: false,
  createdById: null,
}

describe("course visibility: teacher-owned draft preview", () => {
  test("the owning teacher can preview their own draft", () => {
    assert.equal(isCourseVisibleToUser(draftOwnedByA, "TEACHER", teacherA), true)
  })

  test("another teacher cannot see the draft", () => {
    assert.equal(isCourseVisibleToUser(draftOwnedByA, "TEACHER", teacherB), false)
  })

  test("anonymous and student callers cannot see the draft", () => {
    assert.equal(isCourseVisibleToUser(draftOwnedByA, undefined, undefined), false)
    assert.equal(isCourseVisibleToUser(draftOwnedByA, "FREE", "user-student"), false)
    assert.equal(isCourseVisibleToUser(draftOwnedByA, "PREMIUM", "user-student"), false)
    assert.equal(isCourseVisibleToUser(draftOwnedByA, "TEACHER", null), false)
  })

  test("admin can see any draft regardless of ownership", () => {
    assert.equal(isCourseVisibleToUser(draftOwnedByA, "ADMIN", "user-admin"), true)
    assert.equal(isCourseVisibleToUser(draftWithoutOwner, "ADMIN", "user-admin"), true)
  })

  test("teacher cannot claim a legacy draft with no creator", () => {
    assert.equal(isCourseVisibleToUser(draftWithoutOwner, "TEACHER", teacherA), false)
  })

  test("published courses stay visible to everyone", () => {
    assert.equal(isCourseVisibleToUser(publishedOwnedByA, undefined, undefined), true)
    assert.equal(isCourseVisibleToUser(publishedOwnedByA, "FREE", "user-student"), true)
    assert.equal(isCourseVisibleToUser(publishedOwnedByA, "TEACHER", teacherB), true)
  })
})
