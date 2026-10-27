import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { prisma } from "@/lib/prisma"
import {
  getCourseCustomMetadata,
  saveCourseCustomMetadata,
} from "@/lib/services/course-metadata-service"

/**
 * B2: course custom metadata is stored in Course.metadataJson. Two defects are
 * covered:
 *  1. the save swallowed database errors and returned as if it had written, so
 *     the server action reported success:true for a failed write;
 *  2. a module-level cache plus a legacy disk read (data/course-metadata.json)
 *     could return values that were never in the database.
 */

const originalFindFirst = prisma.course.findFirst.bind(prisma.course)
const originalUpdate = prisma.course.update.bind(prisma.course)

let courseId = ""
let originalMetadata: string | null = null

describe("B2 course metadata is DB-only and never reports a failed write", () => {
  before(async () => {
    await prisma.$connect()
    const course = await prisma.course.findFirst({ select: { id: true } })
    assert.ok(course, "test DB needs at least one course (npm run seed:test)")
    courseId = course!.id
    const row = await prisma.course.findUnique({
      where: { id: courseId },
      select: { metadataJson: true },
    })
    originalMetadata = row?.metadataJson ?? null
  })

  after(async () => {
    ;(prisma.course as any).findFirst = originalFindFirst
    ;(prisma.course as any).update = originalUpdate
    await prisma.course.update({
      where: { id: courseId },
      data: { metadataJson: originalMetadata },
    })
    await prisma.$disconnect()
  })

  it("a database write failure rejects instead of returning success", async () => {
    ;(prisma.course as any).update = async () => {
      throw new Error("simulated write failure")
    }

    await assert.rejects(
      () => saveCourseCustomMetadata(courseId, { projectCount: 7 }),
      /simulated write failure/
    )

    ;(prisma.course as any).update = originalUpdate
  })

  it("a database read failure rejects instead of falling back to defaults", async () => {
    ;(prisma.course as any).findFirst = async () => {
      throw new Error("simulated read failure")
    }

    await assert.rejects(
      () => getCourseCustomMetadata(courseId),
      /simulated read failure/
    )

    ;(prisma.course as any).findFirst = originalFindFirst
  })

  it("a saved value is read back immediately (no stale module cache)", async () => {
    await saveCourseCustomMetadata(courseId, { projectCount: 11 })
    const first = await getCourseCustomMetadata(courseId)
    assert.equal(first.projectCount, 11)

    await saveCourseCustomMetadata(courseId, { projectCount: 12 })
    const second = await getCourseCustomMetadata(courseId)
    assert.equal(second.projectCount, 12)
  })

  it("legacy data/course-metadata.json is no longer used as a source", async () => {
    // This key exists only in the legacy JSON file (projectCount: 2), never in
    // the database. With the disk fallback removed the defaults apply (14).
    const legacy = await getCourseCustomMetadata("test-genai-masterclass")
    assert.equal(legacy.courseId, "test-genai-masterclass")
    assert.equal(legacy.projectCount, 14)
  })
})
