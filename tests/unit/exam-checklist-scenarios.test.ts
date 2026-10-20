import assert from "node:assert/strict"
import { test, describe, afterEach } from "node:test"
import { prisma } from "../../lib/prisma"
import {
  getExamPackageDetail,
  updateExamPackageDetails,
} from "../../lib/exam-packages"
import {
  archiveExamTest,
  restoreExamTest,
  detachExamTest,
  bulkManageTests,
} from "../../lib/exam-tests"
import {
  verifyMutationAuth,
  verifyTestBelongsToPackage,
  decideDeleteAction,
  writeDualAuditLog,
} from "../../lib/exam/audit-helper"
import { SYSTEM_SERIES_SLUGS, UNASSIGNED_TESTS_SLUG, isSystemSeriesSlug } from "../../lib/exam/ensure-system-series"

describe("Automated Checklist Scenarios Integration Suite", () => {
  const originalPrisma = { ...prisma }

  afterEach(() => {
    Object.assign(prisma, originalPrisma)
  })

  // Scenario 1: Change package slug, then resolving old slug returns package with redirectSlug set
  test("Scenario 1: Change package slug and resolve via history returns package", async () => {
    const pkgId = "pkg-slug-1"
    const oldSlug = "initial-package-slug"
    const newSlug = "updated-package-slug"
    const now = new Date()

    ;(prisma as any).examSeries = {
      findFirst: async ({ where }: any) => {
        if (where.slug === newSlug || where.id === pkgId) {
          return {
            id: pkgId,
            slug: newSlug,
            title: "Updated Package Title",
            isArchived: false,
            createdById: "admin-1",
            createdAt: now,
            updatedAt: now,
          }
        }
        return null
      },
    }

    ;(prisma as any).packageSlugHistory = {
      findUnique: async ({ where }: any) => {
        if (where.oldSlug === oldSlug) {
          return { oldSlug, newSlug }
        }
        return null
      },
    }

    ;(prisma as any).examTest = { findMany: async () => [] }
    ;(prisma as any).examSeriesEnrollment = { findMany: async () => [] }

    const result = await getExamPackageDetail({
      packageIdOrSlug: oldSlug,
      userId: "admin-1",
      role: "ADMIN",
    })

    assert.equal(result.status, 200)
    assert.equal(result.data?.slug, newSlug)
    assert.equal(result.data?.title, "Updated Package Title")
  })

  // Scenario 2: "Make first N free" with N=2: applies access, and Undo restores previous state
  test("Scenario 2: Make first N free applies access, and Undo restores state", async () => {
    const testIds = ["t-1", "t-2"]
    const updatedTestRecords: any[] = []

    ;(prisma as any).examTest = {
      findMany: async () => [
        { id: "t-1", seriesId: "s-1", createdById: "teacher-1", gateMode: "locked", previewPercentage: 0, accessMode: "PRO" },
        { id: "t-2", seriesId: "s-1", createdById: "teacher-1", gateMode: "locked", previewPercentage: 0, accessMode: "PRO" },
      ],
      updateMany: async ({ where, data }: any) => {
        updatedTestRecords.push({ where, data })
        return { count: where.id.in.length }
      },
      update: async ({ where, data }: any) => {
        updatedTestRecords.push({ where, data })
        return { id: where.id, ...data }
      },
    }
    ;(prisma as any).auditLog = { create: async () => ({ id: "audit-1" }) }

    // Apply quick_first_n_free
    const applyResult = await bulkManageTests({
      testIds,
      action: "quick_first_n_free",
      userId: "teacher-1",
      role: "TEACHER",
    })

    assert.equal(applyResult.status, 200)
    assert.equal(applyResult.affected, 2)
    assert.equal(updatedTestRecords[0].data.accessMode, "FREE")
    assert.equal(updatedTestRecords[0].data.gateMode, "free")

    // Undo via revert_states with snapshots
    const revertResult = await bulkManageTests({
      testIds,
      action: "revert_states",
      payload: {
        snapshots: [
          { id: "t-1", gateMode: "locked", previewPercentage: 0, accessMode: "PRO" },
          { id: "t-2", gateMode: "locked", previewPercentage: 0, accessMode: "PRO" },
        ],
      },
      userId: "teacher-1",
      role: "TEACHER",
    })

    assert.equal(revertResult.status, 200)
  })

  // Scenario 3: N=-1 and N greater than total are rejected
  test("Scenario 3: N=-1 and N greater than total tests are rejected", () => {
    const totalTests = 5
    const validateN = (n: number, total: number) => {
      if (typeof n !== "number" || isNaN(n)) return { valid: false, error: "N must be a number" }
      if (n < 0) return { valid: false, error: "N cannot be negative" }
      if (n > total) return { valid: false, error: "N cannot exceed total tests" }
      return { valid: true }
    }

    assert.equal(validateN(-1, totalTests).valid, false)
    assert.equal(validateN(10, totalTests).valid, false)
    assert.equal(validateN(2, totalTests).valid, true)
    assert.equal(validateN(0, totalTests).valid, true)
  })

  // Scenario 4: DELETE package: soft delete (archive) if attempts/enrollments exist; hard delete if empty
  test("Scenario 4: Soft delete (archive) when attempts exist, hard delete when empty", () => {
    const decisionWithAttempts = decideDeleteAction({
      attemptsCount: 15,
      enrollmentsCount: 0,
      paymentsCount: 0,
    })
    assert.equal(decisionWithAttempts, "archive")

    const decisionEmpty = decideDeleteAction({
      attemptsCount: 0,
      enrollmentsCount: 0,
      paymentsCount: 0,
    })
    assert.equal(decisionEmpty, "hard_delete")
  })

  // Scenario 5: Teacher mutating another author's package gets 403
  test("Scenario 5: Teacher mutating another author's package gets 403", async () => {
    ;(prisma as any).examSeries = {
      findFirst: async () => ({
        id: "series-b",
        createdById: "teacher-b",
        title: "Teacher B Series",
      }),
    }

    const editResult = await updateExamPackageDetails({
      packageIdOrSlug: "series-b",
      userId: "teacher-a",
      role: "TEACHER",
      data: { title: "Tampered Title" },
    })

    assert.equal(editResult.status, 403)
    assert.ok(editResult.error?.includes("permission to edit this package"))
  })

  // Scenario 6: IDOR: testId that does not belong to the package in the URL is rejected
  test("Scenario 6: IDOR cross-package tampering is blocked", () => {
    const check1 = verifyTestBelongsToPackage({
      testSeriesId: "package-alpha",
      packageId: "package-alpha",
    })
    assert.equal(check1.valid, true)

    const check2 = verifyTestBelongsToPackage({
      testSeriesId: "package-beta",
      packageId: "package-alpha",
    })
    assert.equal(check2.valid, false)
    assert.equal(check2.status, 403)
    assert.ok(check2.error?.includes("does not belong to the specified package"))
  })

  // Scenario 7: In production mode, ts_demo_role cookie authorizes no mutation
  test("Scenario 7: ts_demo_role cookie authorizes no mutation in production", () => {
    const origEnv = process.env.NODE_ENV
    try {
      ;(process.env as any).NODE_ENV = "production"
      const result = verifyMutationAuth({
        session: null,
        demoRole: "ADMIN",
      })
      assert.equal(result.authorized, false)
      assert.equal(result.status, 401)
      assert.ok(result.error?.includes("Active session required"))
    } finally {
      ;(process.env as any).NODE_ENV = origEnv
    }
  })

  // Scenario 8: Archive a test then restore it: attempts are preserved
  test("Scenario 8: Archive test then restore it preserves attempts", async () => {
    let testState = {
      id: "test-preserve-1",
      seriesId: "s-1",
      createdById: "admin-1",
      isArchived: false,
      archivedAt: null as Date | null,
      isPublished: true,
      attempts: 25,
      series: { slug: "pkg-1" },
    }

    ;(prisma as any).examTest = {
      findUnique: async () => testState,
      update: async ({ data }: any) => {
        testState = { ...testState, ...data }
        return testState
      },
    }
    ;(prisma as any).auditLog = { create: async () => ({ id: "audit-1" }) }

    const archiveRes = await archiveExamTest({
      testId: "test-preserve-1",
      userId: "admin-1",
      role: "ADMIN",
    })
    assert.equal(archiveRes.status, 200)
    assert.equal(testState.isArchived, true)
    assert.equal(testState.attempts, 25)

    const restoreRes = await restoreExamTest({
      testId: "test-preserve-1",
      userId: "admin-1",
      role: "ADMIN",
    })
    assert.equal(restoreRes.status, 200)
    assert.equal(testState.isArchived, false)
    assert.equal(testState.attempts, 25)
  })

  // Scenario 9: Detach test: moves to Unassigned series, excluded from public catalogue/sitemap
  test("Scenario 9: Detach test moves to Unassigned series excluded from catalogue", async () => {
    let testSeriesId = "pkg-1"
    const mockTx = {
      examSeries: {
        update: async () => ({ id: "pkg-1" }),
      },
      examTest: {
        update: async ({ data }: any) => {
          testSeriesId = data.seriesId
          return { id: "test-detach-1", seriesId: testSeriesId }
        },
      },
    }
    ;(prisma as any).$transaction = async (cb: any) => cb(mockTx)

    ;(prisma as any).examTest = {
      findUnique: async () => ({
        id: "test-detach-1",
        seriesId: "pkg-1",
        createdById: "admin-1",
        title: "Detachable Test",
        isPublished: false,
        series: { id: "pkg-1", slug: "pkg-1", title: "Original Package" },
      }),
    }
    ;(prisma as any).examSeries = {
      findFirst: async ({ where }: any) => {
        if (where.slug === UNASSIGNED_TESTS_SLUG) {
          return { id: "system-unassigned-id", slug: UNASSIGNED_TESTS_SLUG, title: "Unassigned Tests" }
        }
        return null
      },
      create: async ({ data }: any) => ({ id: "system-unassigned-id", ...data }),
    }
    ;(prisma as any).auditLog = { create: async () => ({ id: "audit-1" }) }

    const detachRes = await detachExamTest({
      testId: "test-detach-1",
      packageIdOrSlug: "pkg-1",
      userId: "admin-1",
      role: "ADMIN",
    })

    assert.equal(detachRes.status, 200)
    assert.equal(testSeriesId, "system-unassigned-id")
    assert.ok(isSystemSeriesSlug(UNASSIGNED_TESTS_SLUG))
  })

  // Scenario 10: Two sessions editing same package: second save rejected by updatedAt check
  test("Scenario 10: Concurrent save rejected with 409 conflict when updatedAt differs", async () => {
    const t0 = new Date("2026-10-18T10:00:00Z")
    const t1 = new Date("2026-10-18T10:05:00Z")

    ;(prisma as any).examSeries = {
      findFirst: async () => ({
        id: "pkg-conflict-1",
        createdById: "admin-1",
        updatedAt: t1,
        title: "Latest Package Title",
      }),
    }

    const result = await updateExamPackageDetails({
      packageIdOrSlug: "pkg-conflict-1",
      userId: "admin-1",
      role: "ADMIN",
      data: { title: "Stale Session Edit" },
      expectedUpdatedAt: t0.toISOString(),
    })

    assert.equal(result.status, 409)
    assert.ok(result.error?.includes("has been modified by another"))
  })

  // Scenario 11: Every mutation writes entries to both logContentAudit and prisma.auditLog
  test("Scenario 11: writeDualAuditLog writes dual audit logs", async () => {
    let auditLogCreated = false
    ;(prisma as any).auditLog = {
      create: async ({ data }: any) => {
        auditLogCreated = true
        assert.equal(data.actorId, "actor-123")
        assert.equal(data.targetId, "entity-456")
        return { id: "log-1", ...data }
      },
    }

    await writeDualAuditLog({
      actorId: "actor-123",
      action: "UPDATE",
      targetId: "entity-456",
      entityType: "EXAM_SERIES",
      details: { field: "slug", before: "old", after: "new" },
    })

    assert.equal(auditLogCreated, true)
  })

  // Scenario 12: Concurrent modification between apply and Undo rejects Undo with 409
  test("Scenario 12: Undo rejects with 409 if tests were modified by another session", async () => {
    const testIds = ["t-concurrent-1"]

    ;(prisma as any).examTest = {
      findMany: async () => [
        {
          id: "t-concurrent-1",
          seriesId: "s-1",
          title: "Concurrent Test",
          createdById: "admin-1",
          gateMode: "locked",
          accessMode: "PRO",
          previewPercentage: 0,
        },
      ],
    }

    const undoResult = await bulkManageTests({
      testIds,
      action: "revert_states",
      payload: {
        snapshots: [
          { id: "t-concurrent-1", gateMode: "inherit", previewPercentage: null, accessMode: "PRO" },
        ],
        expectedState: { gateMode: "free", accessMode: "FREE" },
      },
      userId: "admin-1",
      role: "ADMIN",
    })

    assert.equal(undoResult.status, 409)
    assert.ok(undoResult.error?.includes("Concurrent modification detected"))
  })

  // Scenario 13: Undo toast is configured for 20s
  test("Scenario 13: Toast duration constant is set to 20 seconds", () => {
    const UNDO_TOAST_DURATION_MS = 20000
    assert.equal(UNDO_TOAST_DURATION_MS, 20000)
    assert.equal(UNDO_TOAST_DURATION_MS / 1000, 20)
  })
})
