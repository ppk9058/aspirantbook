import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { parseCourseMetadata } from "../../lib/courses/metadata-schema"
import {
  getAllTeachers,
  getTeacherById,
  upsertTeacher,
  resolveCourseTeachers,
  type ReusableTeacher,
} from "../../lib/teachers/library"

describe("Reusable Teacher Library (JSON & Multi-Course Attachment)", () => {
  const sharedTeacher = {
    id: "lib-vikramaditya",
    name: "Dr. Vikramaditya Rathore",
    nameHi: "डॉ. विक्रमादित्य राठौड़",
    role: "Polity & Governance Expert",
    roleHi: "राजव्यवस्था एवं शासन विशेषज्ञ",
    bio: "14+ years mentoring civil services aspirants.",
    credentials: [{ label: "14+ Yrs Mentorship" }, { label: "Ph.D Public Admin" }],
    isPrimary: true,
  }

  test("verifies one teacher attached to two different courses in course metadata", () => {
    // Course 1: UPSC GS Foundation
    const course1MetaRaw = JSON.stringify({
      schemaVersion: 2,
      teachers: [sharedTeacher],
    })
    const parsed1 = parseCourseMetadata(course1MetaRaw)
    assert.ok(parsed1.ok)
    assert.equal(parsed1.data?.teachers?.length, 1)
    assert.equal(parsed1.data?.teachers?.[0].name, "Dr. Vikramaditya Rathore")
    assert.equal(parsed1.data?.teachers?.[0].role, "Polity & Governance Expert")

    // Course 2: State Services Foundation
    const course2MetaRaw = JSON.stringify({
      schemaVersion: 2,
      teachers: [sharedTeacher, { name: "Ananya Sen", role: "Economy Faculty" }],
    })
    const parsed2 = parseCourseMetadata(course2MetaRaw)
    assert.ok(parsed2.ok)
    assert.equal(parsed2.data?.teachers?.length, 2)
    assert.equal(parsed2.data?.teachers?.[0].name, "Dr. Vikramaditya Rathore")
    assert.equal(parsed2.data?.teachers?.[0].role, "Polity & Governance Expert")
    assert.equal(parsed2.data?.teachers?.[1].name, "Ananya Sen")

    // Assert same teacher identity attached to both courses
    assert.equal(parsed1.data?.teachers?.[0].name, parsed2.data?.teachers?.[0].name)
    assert.equal(parsed1.data?.teachers?.[0].role, parsed2.data?.teachers?.[0].role)
  })

  test("proves central teacher stored once in data/teacher-library.json: editing once updates multiple courses referencing the ID", () => {
    const teacherId = "teacher-dr-vikas"

    // Initial state check
    const initialTeacher = getTeacherById(teacherId)
    assert.ok(initialTeacher, "Default teacher-dr-vikas must exist in teacher library")

    // Course A and Course B only store reference { teacherId: "teacher-dr-vikas" }
    const courseATeachersRef = [{ teacherId }]
    const courseBTeachersRef = [{ teacherId, role: "Visiting Ethics Mentor" }] // with custom course role

    const resolvedA1 = resolveCourseTeachers(courseATeachersRef)
    const resolvedB1 = resolveCourseTeachers(courseBTeachersRef)
    assert.equal(resolvedA1[0].name, initialTeacher.name)
    assert.equal(resolvedB1[0].name, initialTeacher.name)
    assert.equal(resolvedB1[0].role, "Visiting Ethics Mentor")

    // Update central teacher profile once
    const updatedBio = "Updated Central Profile: 20+ Years Mentoring 50,000+ Aspirants"
    const updatedName = "Dr. Vikas Divyakirti (Chief Faculty)"
    upsertTeacher({
      id: teacherId,
      name: updatedName,
      bio: updatedBio,
      credentials: [{ label: "20+ Yrs Mentorship" }, { label: "UPSC Gold Medalist" }],
    })

    // Both Course A and Course B resolve again
    const resolvedA2 = resolveCourseTeachers(courseATeachersRef)
    const resolvedB2 = resolveCourseTeachers(courseBTeachersRef)

    // PROOF: Both courses immediately receive the updated name, bio, and credentials!
    assert.equal(resolvedA2[0].name, updatedName)
    assert.equal(resolvedB2[0].name, updatedName)
    assert.equal(resolvedA2[0].bio, updatedBio)
    assert.equal(resolvedB2[0].bio, updatedBio)
    assert.equal(resolvedA2[0].credentials?.[0]?.label, "20+ Yrs Mentorship")
    assert.equal(resolvedB2[0].credentials?.[0]?.label, "20+ Yrs Mentorship")

    // Restore original profile
    upsertTeacher(initialTeacher)
    const restored = getTeacherById(teacherId)
    assert.equal(restored?.name, initialTeacher.name)
  })
})
