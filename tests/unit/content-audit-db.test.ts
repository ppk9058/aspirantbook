import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { prisma } from "@/lib/prisma"
import {
  logContentAudit,
  getRecentAuditEvents,
  countAuditEvents,
} from "@/lib/actions/admin/audit"
import { backfillContentAuditFromJsonl } from "@/lib/audit/backfill-content-audit"

/**
 * B5: the content audit trail was a local append-only jsonl file. On a
 * multi-instance or read-only deployment that silently loses events and can
 * never show the whole trail.
 *
 * Covered here:
 *  1. events are persisted in the database, not on disk;
 *  2. reads are paginated instead of loading the whole file;
 *  3. the jsonl backfill is idempotent.
 */

const entityId = `b5-test-${Date.now()}`

describe("B5 content audit events live in the database", () => {
  let tmpDir = ""
  let jsonlPath = ""

  before(async () => {
    await prisma.$connect()
    await prisma.auditEvent.deleteMany({ where: { entityId } })
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "b5-audit-"))
    jsonlPath = path.join(tmpDir, "audit-events.jsonl")
  })

  after(async () => {
    await prisma.auditEvent.deleteMany({ where: { entityId } })
    await fs.rm(tmpDir, { recursive: true, force: true })
    await prisma.$disconnect()
  })

  it("writes an event to the database and nothing to disk", async () => {
    const res = await logContentAudit({
      entityId,
      entityType: "LESSON",
      action: "CREATE",
      details: { title: "B5 lesson" },
    })
    assert.equal(res.success, true)

    const row = await prisma.auditEvent.findFirst({ where: { entityId } })
    assert.ok(row, "event must be stored in AuditEvent")
    assert.equal(row!.entityType, "LESSON")
    assert.equal(row!.action, "CREATE")
    assert.deepEqual(row!.details, { title: "B5 lesson" })

    // The legacy file is never created by the new implementation.
    const legacy = path.join(process.cwd(), ".content-audit", "audit-events.jsonl")
    const exists = await fs
      .access(legacy)
      .then(() => true)
      .catch(() => false)
    if (exists) {
      const content = await fs.readFile(legacy, "utf-8")
      assert.equal(content.includes(entityId), false, "event must not be appended to the file")
    }
  })

  it("paginates reads newest first", async () => {
    await prisma.auditEvent.deleteMany({ where: { entityId } })
    for (let i = 0; i < 5; i++) {
      await logContentAudit({
        entityId,
        entityType: "COURSE",
        action: "UPDATE",
        details: { step: i },
      })
    }

    const firstPage = await getRecentAuditEvents({ entityId, limit: 2, offset: 0 })
    const secondPage = await getRecentAuditEvents({ entityId, limit: 2, offset: 2 })
    const thirdPage = await getRecentAuditEvents({ entityId, limit: 2, offset: 4 })

    assert.equal(firstPage.length, 2)
    assert.equal(secondPage.length, 2)
    assert.equal(thirdPage.length, 1)
    assert.equal(await countAuditEvents({ entityId }), 5)

    const all = [...firstPage, ...secondPage, ...thirdPage]
    const steps = all.map((e) => e.details?.step)
    assert.deepEqual(steps, [4, 3, 2, 1, 0], "newest event first")

    // The legacy numeric signature still works.
    const byNumber = await getRecentAuditEvents(1)
    assert.equal(byNumber.length <= 1, true)
  })

  it("backfills the legacy jsonl idempotently", async () => {
    const otherEntity = `${entityId}-jsonl`
    await prisma.auditEvent.deleteMany({ where: { entityId: otherEntity } })

    const lines = [
      {
        entityId: otherEntity,
        entityType: "CHAPTER",
        action: "PUBLISH",
        userId: "u1",
        userEmail: "owner@test.local",
        timestamp: "2026-10-20T10:00:00.000Z",
        details: { from: "DRAFT" },
      },
      {
        entityId: otherEntity,
        entityType: "CHAPTER",
        action: "UNPUBLISH",
        userId: "u1",
        userEmail: "owner@test.local",
        timestamp: "2026-10-20T11:00:00.000Z",
        details: { from: "PUBLISHED" },
      },
    ]
    await fs.writeFile(jsonlPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n{not json}\n", "utf-8")

    const first = await backfillContentAuditFromJsonl(jsonlPath)
    assert.equal(first.read, 3)
    assert.equal(first.inserted, 2)
    assert.equal(first.invalid, 1)
    assert.equal(await prisma.auditEvent.count({ where: { entityId: otherEntity } }), 2)

    const second = await backfillContentAuditFromJsonl(jsonlPath)
    assert.equal(second.inserted, 0, "re-running the backfill must not duplicate rows")
    assert.equal(await prisma.auditEvent.count({ where: { entityId: otherEntity } }), 2)

    const stored = await prisma.auditEvent.findMany({
      where: { entityId: otherEntity },
      orderBy: { createdAt: "asc" },
    })
    assert.equal(stored[0].action, "PUBLISH")
    assert.equal(stored[0].createdAt.toISOString(), "2026-10-20T10:00:00.000Z")
  })
})
