import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"

import { prisma } from "@/lib/prisma"

/**
 * C3: the AUDIT2 fixes introduced and exercised filter/sort/join predicates on
 * columns that had no supporting index — the revenue rollup scanned Payment by
 * day, the dashboard read ExamAttempt by user then startedAt, the static
 * content-engine export read published rows ordered by createdAt, the new Doubt
 * table was queried by status+createdAt, and so on.
 *
 * The migration 20261028190641_audit2_c3_indexes is additive only (CREATE
 * INDEX). This test proves the indexes are actually present in the connected
 * database and pins the additive contract of the migration SQL.
 */

const ROOT = process.cwd()

const EXPECTED: Array<{ table: string; index: string; columns: string[] }> = [
  { table: "Book", index: "Book_createdAt_idx", columns: ["createdAt"] },
  { table: "BookOrder", index: "BookOrder_userId_status_idx", columns: ["userId", "status"] },
  { table: "BookOrder", index: "BookOrder_createdAt_idx", columns: ["createdAt"] },
  {
    table: "ContentEngineQuestion",
    index: "ContentEngineQuestion_isPublished_status_createdAt_idx",
    columns: ["isPublished", "status", "createdAt"],
  },
  { table: "Course", index: "Course_isPublished_createdAt_idx", columns: ["isPublished", "createdAt"] },
  { table: "Doubt", index: "Doubt_status_createdAt_idx", columns: ["status", "createdAt"] },
  { table: "Doubt", index: "Doubt_subject_createdAt_idx", columns: ["subject", "createdAt"] },
  { table: "Enrollment", index: "Enrollment_courseId_enrolledAt_idx", columns: ["courseId", "enrolledAt"] },
  {
    table: "ExamAttempt",
    index: "ExamAttempt_userId_startedAt_idx",
    columns: ["userId", "startedAt"],
  },
  {
    table: "ExamTest",
    index: "ExamTest_isPublished_isArchived_createdAt_idx",
    columns: ["isPublished", "isArchived", "createdAt"],
  },
  {
    table: "ExamTest",
    index: "ExamTest_isPublished_isArchived_order_idx",
    columns: ["isPublished", "isArchived", "order"],
  },
  {
    table: "FormSubmission",
    index: "FormSubmission_formSlug_submittedAt_idx",
    columns: ["formSlug", "submittedAt"],
  },
  { table: "Payment", index: "Payment_createdAt_idx", columns: ["createdAt"] },
  { table: "Subscription", index: "Subscription_createdAt_idx", columns: ["createdAt"] },
]

describe("C3 index coverage for the fixed queries", () => {
  before(async () => {
    await prisma.$connect()
  })

  after(async () => {
    await prisma.$disconnect()
  })

  it("has every new index in the database", async () => {
    const rows = await prisma.$queryRaw<Array<{ tablename: string; indexname: string }>>`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `
    const present = new Set(rows.map((r) => `${r.tablename}.${r.indexname}`))

    const missing = EXPECTED.filter((e) => !present.has(`${e.table}.${e.index}`))
    assert.deepEqual(
      missing.map((m) => m.index),
      [],
      "every index added by the C3 migration must exist in the database"
    )
  })

  it("each index covers the exact filter/sort columns its query uses", async () => {
    for (const expected of EXPECTED) {
      const definition = await prisma.$queryRaw<Array<{ indexdef: string }>>`
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = ${expected.table}
          AND indexname = ${expected.index}
      `
      assert.equal(definition.length, 1, `${expected.index} must exist`)
      const def = definition[0].indexdef
      for (const column of expected.columns) {
        assert.match(
          def,
          new RegExp(`\\b${column}\\b`),
          `${expected.index} must include ${column}, got: ${def}`
        )
      }
    }
  })

  it("the C3 migration is additive only", async () => {
    const dir = path.join(ROOT, "prisma/migrations/20261028190641_audit2_c3_indexes")
    const sql = await fs.readFile(path.join(dir, "migration.sql"), "utf-8")

    assert.ok(sql.includes("CREATE INDEX"), "the migration must create indexes")
    assert.equal(/\bDROP\b/i.test(sql), false, "an index migration must not drop anything")
    assert.equal(/\bALTER TABLE\b/i.test(sql), false, "no table rewrite is allowed")
    assert.equal(/\bDELETE\b|\bTRUNCATE\b/i.test(sql), false, "no data may be touched")

    for (const expected of EXPECTED) {
      assert.ok(
        sql.includes(`"${expected.index}"`),
        `migration.sql must create ${expected.index}`
      )
    }
  })
})
