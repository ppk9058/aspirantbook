import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  courseDraftUpdateSchema,
  courseInlineUpdateSchema,
  contentEngineQuestionPatchSchema,
  parseOrThrow,
} from "../../lib/validation/admin-payloads"

describe("A12 course draft allowlist", () => {
  test("strips unknown keys (id, enrollmentCount, chapters, createdById, relations)", () => {
    const parsed = courseDraftUpdateSchema.parse({
      title: "Hardened course",
      description: "desc",
      difficulty: "BEGINNER",
      technology: "Node",
      isPremium: true,
      status: "DRAFT",
      id: "attacker-chosen-id",
      enrollmentCount: 999999,
      rating: 5,
      externalId: "spoof",
      chapters: { create: [{ title: "injected" }] },
      createdById: "someone-else",
    } as any)
    assert.equal(parsed.title, "Hardened course")
    assert.equal((parsed as any).id, undefined)
    assert.equal((parsed as any).enrollmentCount, undefined)
    assert.equal((parsed as any).externalId, undefined)
    assert.equal((parsed as any).chapters, undefined)
    assert.equal((parsed as any).createdById, undefined)
    assert.equal((parsed as any).rating, undefined)
  })

  test("rejects an invalid status and an out-of-range preview", () => {
    assert.equal(courseDraftUpdateSchema.safeParse({ status: "DELETED" }).success, false)
    assert.equal(courseDraftUpdateSchema.safeParse({ previewPercentage: 500 }).success, false)
    assert.equal(courseDraftUpdateSchema.safeParse({ seoMode: "everything" }).success, false)
  })

  test("accepts every field the course editor actually sends", () => {
    const result = courseDraftUpdateSchema.safeParse({
      title: "T",
      description: "D",
      difficulty: "ADVANCED",
      technology: "React",
      isPremium: false,
      status: "PUBLISHED",
      duration: 3600,
      prerequisites: "A, B",
      isGated: true,
      previewPercentage: 25,
      seoMode: "bot-full",
      gateTitle: null,
      gateSubtitle: null,
    })
    assert.equal(result.success, true)
  })

  test("inline updates use the same allowlist", () => {
    const parsed = courseInlineUpdateSchema.parse({
      title: "Inline",
      adminNote: "hidden",
      isPublished: true,
    } as any)
    assert.equal(parsed.title, "Inline")
    assert.equal((parsed as any).adminNote, undefined)
  })

  test("parseOrThrow reports the offending field", () => {
    assert.throws(
      () => parseOrThrow(courseDraftUpdateSchema, { difficulty: "EXPERT" }),
      /Invalid payload: difficulty/
    )
  })
})

describe("A12 content-engine question PATCH allowlist", () => {
  test("strips ids, hashes and relations", () => {
    const parsed = contentEngineQuestionPatchSchema.parse({
      isVerified: true,
      shortId: "hijack",
      textHash: "hijack",
      id: "hijack",
      translations: { create: [{ lang: "hi", q: "x" }] },
      batch: { connect: { id: "other" } },
    } as any)
    assert.equal(parsed.isVerified, true)
    for (const key of ["shortId", "textHash", "id", "translations", "batch"]) {
      assert.equal((parsed as any)[key], undefined, `${key} must be stripped`)
    }
  })

  test("rejects an invalid status", () => {
    assert.equal(contentEngineQuestionPatchSchema.safeParse({ status: "DELETED" }).success, false)
    assert.equal(contentEngineQuestionPatchSchema.safeParse({ status: "PUBLISHED" }).success, true)
  })
})
