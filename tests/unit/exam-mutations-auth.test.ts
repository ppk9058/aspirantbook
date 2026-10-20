import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  verifyMutationAuth,
  verifyTestBelongsToPackage,
  decideDeleteAction,
} from "../../lib/exam/audit-helper"

describe("verifyMutationAuth Unit Tests", () => {
  test("rejects mutation when session is missing and no demo cookie provided", () => {
    const result = verifyMutationAuth({ session: null })
    assert.equal(result.authorized, false)
    assert.equal(result.status, 401)
  })

  test("rejects mutation for non-creator student role", () => {
    const session = { user: { id: "student-1", role: "STUDENT", email: "stu@test.com" } }
    const result = verifyMutationAuth({ session })
    assert.equal(result.authorized, false)
    assert.equal(result.status, 403)
  })

  test("blocks ts_demo_role cookie fallback in production environment", () => {
    const originalEnv = process.env.NODE_ENV
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
      ;(process.env as any).NODE_ENV = originalEnv
    }
  })

  test("enforces teacher ownership: rejects teacher trying to mutate another author's content", () => {
    const session = { user: { id: "teacher-a", role: "TEACHER", email: "ta@test.com" } }
    const result = verifyMutationAuth({
      session,
      createdById: "teacher-b", // belongs to teacher-b
    })
    assert.equal(result.authorized, false)
    assert.equal(result.status, 403)
    assert.ok(result.error?.includes("permission to modify content created by another author"))
  })

  test("authorizes teacher mutating their own content", () => {
    const session = { user: { id: "teacher-a", role: "TEACHER", email: "ta@test.com" } }
    const result = verifyMutationAuth({
      session,
      createdById: "teacher-a",
    })
    assert.equal(result.authorized, true)
    assert.equal(result.userId, "teacher-a")
    assert.equal(result.role, "TEACHER")
  })

  test("admin bypasses teacher ownership check", () => {
    const session = { user: { id: "admin-1", role: "ADMIN", email: "admin@test.com" } }
    const result = verifyMutationAuth({
      session,
      createdById: "teacher-a", // content belongs to teacher-a, but admin can manage
    })
    assert.equal(result.authorized, true)
    assert.equal(result.userId, "admin-1")
    assert.equal(result.role, "ADMIN")
  })
})

describe("IDOR Protection Unit Tests (verifyTestBelongsToPackage)", () => {
  test("allows test when seriesId matches packageId", () => {
    const result = verifyTestBelongsToPackage({
      testSeriesId: "pkg-101",
      packageId: "pkg-101",
    })
    assert.equal(result.valid, true)
    assert.equal(result.status, 200)
  })

  test("blocks test when seriesId does not match packageId (cross-package tampering IDOR)", () => {
    const result = verifyTestBelongsToPackage({
      testSeriesId: "other-package-999",
      packageId: "pkg-101",
    })
    assert.equal(result.valid, false)
    assert.equal(result.status, 403)
    assert.ok(result.error?.includes("IDOR protected"))
  })

  test("blocks test when testSeriesId is missing", () => {
    const result = verifyTestBelongsToPackage({
      testSeriesId: null,
      packageId: "pkg-101",
    })
    assert.equal(result.valid, false)
    assert.equal(result.status, 403)
  })
})

describe("Soft vs Hard Delete Decision Unit Tests (decideDeleteAction)", () => {
  test("decides hard_delete when item has 0 attempts, 0 enrollments, and 0 payments", () => {
    const decision = decideDeleteAction({
      attemptsCount: 0,
      enrollmentsCount: 0,
      paymentsCount: 0,
    })
    assert.equal(decision, "hard_delete")
  })

  test("decides archive (soft delete) when item has student attempts", () => {
    const decision = decideDeleteAction({
      attemptsCount: 5,
      enrollmentsCount: 0,
      paymentsCount: 0,
    })
    assert.equal(decision, "archive")
  })

  test("decides archive (soft delete) when item has active enrollments", () => {
    const decision = decideDeleteAction({
      attemptsCount: 0,
      enrollmentsCount: 12,
      paymentsCount: 0,
    })
    assert.equal(decision, "archive")
  })

  test("decides archive (soft delete) when item has verified payments", () => {
    const decision = decideDeleteAction({
      attemptsCount: 0,
      enrollmentsCount: 0,
      paymentsCount: 3,
    })
    assert.equal(decision, "archive")
  })

  test("decides archive (soft delete) when item has multiple dependencies", () => {
    const decision = decideDeleteAction({
      attemptsCount: 15,
      enrollmentsCount: 20,
      paymentsCount: 8,
    })
    assert.equal(decision, "archive")
  })
})
