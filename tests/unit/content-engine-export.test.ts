import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { prisma } from "@/lib/prisma"
import {
  countPublishedQuestionsForExport,
  readPublishedQuestionsForExport,
} from "@/lib/modules/content-engine/db-service"
import {
  EXPORT_MAX_LIMIT,
  ExportRangeError,
  assertExportFitsInOneArchive,
  buildExportPart,
  parseExportRange,
} from "@/lib/modules/content-engine/export-range"

/**
 * B11: the static export read every published question with all translations in
 * one unbounded `findMany` and zipped the whole corpus in memory.
 *
 * Covered here:
 *  1. range parsing: default page, explicit page, and refusal above the cap;
 *  2. part metadata (offset/next offset/parts) used for the X-Export-* headers;
 *  3. that a default request for more than one archive is refused instead of
 *     silently returning a partial site;
 *  4. that the database read is paged (chunk size honoured, no repeats, no
 *     omissions across offsets) and only returns published rows.
 */

const nonce = `b11-${Date.now()}`

describe("B11 content-engine export is bounded", () => {
  let batchId = ""
  const ids: string[] = []

  before(async () => {
    await prisma.$connect()
    const batch = await prisma.contentEngineBatch.create({
      data: { pastedText: `B11 export fixture ${nonce}` },
      select: { id: true },
    })
    batchId = batch.id

    const rows = await prisma.contentEngineQuestion.createManyAndReturn({
      data: Array.from({ length: 7 }, (_, i) => ({
        shortId: `${nonce}-${i}`,
        textHash: `${nonce}-${i}`,
        q: `Export question ${i} ${nonce}`,
        options: ["a", "b"],
        answer: "a",
        sub: "Polity",
        top: "Constitution",
        exam: "UPSC",
        year: "2026",
        isPublished: true,
        status: "PUBLISHED",
        batchId,
        createdAt: new Date(2026, 0, 1, 0, 0, i),
      })),
      select: { id: true },
    })
    ids.push(...rows.map((r) => r.id))

    // Draft rows must never be exported.
    await prisma.contentEngineQuestion.createMany({
      data: [
        {
          shortId: `${nonce}-draft-1`,
          textHash: `${nonce}-draft-1`,
          q: `Draft question ${nonce}`,
          options: ["a"],
          answer: "a",
          batchId,
        },
        {
          shortId: `${nonce}-draft-2`,
          textHash: `${nonce}-draft-2`,
          q: `Draft question 2 ${nonce}`,
          options: ["a"],
          answer: "a",
          batchId,
          isPublished: false,
          status: "DRAFT",
        },
      ],
    })
  })

  after(async () => {
    await prisma.contentEngineQuestion.deleteMany({ where: { batchId } })
    await prisma.contentEngineBatch.deleteMany({ where: { id: batchId } })
    await prisma.$disconnect()
  })

  it("parses the export range and refuses an oversized page", () => {
    const defaults = parseExportRange(new URLSearchParams())
    assert.equal(defaults.limit, EXPORT_MAX_LIMIT)
    assert.equal(defaults.limitExplicit, false)
    assert.equal(defaults.offset, 0)

    const explicit = parseExportRange(new URLSearchParams("limit=25&offset=50"))
    assert.deepEqual(explicit, { limit: 25, offset: 50, limitExplicit: true })

    for (const bad of ["limit=0", `limit=${EXPORT_MAX_LIMIT + 1}`, "limit=abc", "offset=-1", "offset=1.5"]) {
      assert.throws(
        () => parseExportRange(new URLSearchParams(bad)),
        (error: unknown) => error instanceof ExportRangeError && error.status === 400,
        `${bad} must be rejected`
      )
    }
  })

  it("reports part metadata for the response headers", () => {
    const first = buildExportPart(7, 0, 3, 3)
    assert.deepEqual(first, {
      total: 7,
      offset: 0,
      limit: 3,
      returned: 3,
      nextOffset: 3,
      parts: 3,
      partial: true,
    })

    const last = buildExportPart(7, 6, 3, 1)
    assert.equal(last.nextOffset, null)
    assert.equal(last.partial, false)
    assert.equal(last.parts, 3)

    const empty = buildExportPart(0, 0, 3, 0)
    assert.equal(empty.parts, 1)
    assert.equal(empty.nextOffset, null)
  })

  it("refuses a default request that would need several archives", () => {
    const defaultRange = parseExportRange(new URLSearchParams())
    assert.throws(
      () => assertExportFitsInOneArchive(EXPORT_MAX_LIMIT + 1, defaultRange),
      (error: unknown) => error instanceof ExportRangeError && error.status === 413
    )
    // An explicit (smaller) page is allowed, and a corpus that fits is allowed.
    assert.doesNotThrow(() =>
      assertExportFitsInOneArchive(EXPORT_MAX_LIMIT + 1, parseExportRange(new URLSearchParams("limit=500")))
    )
    assert.doesNotThrow(() => assertExportFitsInOneArchive(5, defaultRange))
  })

  it("reads the corpus in pages without repeats or omissions", async () => {
    const total = await countPublishedQuestionsForExport({ batchId })
    assert.equal(total, 7, "drafts must not be counted")

    const first = await readPublishedQuestionsForExport({
      limit: 3,
      offset: 0,
      chunkSize: 2,
      where: { batchId },
    })
    assert.equal(first.length, 3)
    assert.deepEqual(first.map((q) => q.id), ids.slice(0, 3))
    assert.equal(first[0].translations.length, 0)

    const seen: string[] = []
    let offset = 0
    while (offset < total) {
      const page = await readPublishedQuestionsForExport({
        limit: 2,
        offset,
        chunkSize: 1,
        where: { batchId },
      })
      assert.equal(page.length <= 2, true)
      assert.equal(page.every((q) => q.isPublished), true, "only published rows are exported")
      seen.push(...page.map((q) => q.id))
      offset += page.length
    }

    assert.equal(seen.length, total)
    assert.equal(new Set(seen).size, total, "pages must not repeat a row")
    assert.deepEqual([...seen].sort(), [...ids].sort(), "pages must cover the whole corpus")
  })

  it("stops at the end of the corpus", async () => {
    const beyond = await readPublishedQuestionsForExport({
      limit: 100,
      offset: 5,
      where: { batchId },
    })
    assert.equal(beyond.length, 2)

    const past = await readPublishedQuestionsForExport({
      limit: 10,
      offset: 50,
      where: { batchId },
    })
    assert.equal(past.length, 0)
  })
})
