import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { parseCourseMetadata } from "../../lib/courses/metadata-schema"

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
})
