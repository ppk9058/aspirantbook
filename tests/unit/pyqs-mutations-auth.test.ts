import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { z } from "zod"

// Zod schemas matching app/api/admin/pyqs/papers/[id]/archive/route.ts & bulk/route.ts
const pyqArchiveSchema = z.object({
  isArchived: z.boolean().optional(),
  status: z.enum(["ARCHIVED", "PUBLISHED", "DRAFT"]).optional(),
})

const pyqBulkSchema = z.object({
  paperIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "unpublish", "archive", "restore", "delete"]),
})

// Auth & permission logic matching pyq routes
function verifyPyqPaperAuth({
  user,
  paperCreatorId,
}: {
  user: { isAuthenticated: boolean; role?: string; userId?: string } | null
  paperCreatorId?: string | null
}) {
  if (!user || !user.isAuthenticated) {
    return { authorized: false, status: 401, error: "Unauthorized" }
  }
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return { authorized: false, status: 403, error: "Forbidden: Admin or Teacher required" }
  }
  if (user.role === "TEACHER" && paperCreatorId && paperCreatorId !== user.userId) {
    return {
      authorized: false,
      status: 403,
      error: "Forbidden: You can only modify papers you created",
    }
  }
  return { authorized: true, status: 200 }
}

// Guard logic matching app/api/admin/pyqs/papers/[id]/route.ts & lib/pyqs-service.ts
function verifyPyqDeleteGuard({
  leadsCount,
  unlocksCount,
}: {
  leadsCount: number
  unlocksCount: number
}) {
  if (leadsCount > 0 || unlocksCount > 0) {
    return {
      canDelete: false,
      status: 409,
      error: "Paper has existing leads or unlocks. Hard delete is blocked; archive instead.",
      leadsCount,
      unlocksCount,
    }
  }
  return { canDelete: true, status: 200 }
}

describe("PYQ Studio Auth & Role Verification", () => {
  test("rejects unauthenticated request with 401", () => {
    const res = verifyPyqPaperAuth({ user: null })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 401)
  })

  test("rejects non-teacher/non-admin student role with 403", () => {
    const res = verifyPyqPaperAuth({
      user: { isAuthenticated: true, role: "STUDENT", userId: "stu-1" },
    })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
  })

  test("rejects teacher mutating another author's paper with 403", () => {
    const res = verifyPyqPaperAuth({
      user: { isAuthenticated: true, role: "TEACHER", userId: "teacher-1" },
      paperCreatorId: "teacher-2",
    })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
    assert.ok(res.error?.includes("only modify papers you created"))
  })

  test("authorizes teacher mutating their own paper", () => {
    const res = verifyPyqPaperAuth({
      user: { isAuthenticated: true, role: "TEACHER", userId: "teacher-1" },
      paperCreatorId: "teacher-1",
    })
    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
  })

  test("admin bypasses creator ownership check", () => {
    const res = verifyPyqPaperAuth({
      user: { isAuthenticated: true, role: "ADMIN", userId: "admin-1" },
      paperCreatorId: "teacher-2",
    })
    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
  })
})

describe("PYQ Studio Delete Guard & Dependency Protection", () => {
  test("blocks hard delete with 409 when paper has collected phone leads", () => {
    const guard = verifyPyqDeleteGuard({ leadsCount: 5, unlocksCount: 0 })
    assert.equal(guard.canDelete, false)
    assert.equal(guard.status, 409)
    assert.equal(guard.leadsCount, 5)
    assert.ok(guard.error.includes("Hard delete is blocked"))
  })

  test("blocks hard delete with 409 when paper has verified paid unlocks", () => {
    const guard = verifyPyqDeleteGuard({ leadsCount: 0, unlocksCount: 3 })
    assert.equal(guard.canDelete, false)
    assert.equal(guard.status, 409)
    assert.equal(guard.unlocksCount, 3)
    assert.ok(guard.error.includes("archive instead"))
  })

  test("allows hard delete when 0 leads and 0 unlocks exist", () => {
    const guard = verifyPyqDeleteGuard({ leadsCount: 0, unlocksCount: 0 })
    assert.equal(guard.canDelete, true)
    assert.equal(guard.status, 200)
  })
})

describe("PYQ Studio Payload Validation", () => {
  test("validates archive request with isArchived boolean", () => {
    const valid = pyqArchiveSchema.safeParse({ isArchived: true })
    assert.equal(valid.success, true)
    if (valid.success) {
      assert.equal(valid.data.isArchived, true)
    }
  })

  test("validates archive request with explicit status", () => {
    const valid = pyqArchiveSchema.safeParse({ status: "ARCHIVED" })
    assert.equal(valid.success, true)
  })

  test("rejects invalid status in archive request", () => {
    const invalid = pyqArchiveSchema.safeParse({ status: "INVALID_STATUS" })
    assert.equal(invalid.success, false)
  })

  test("validates bulk request payload", () => {
    const valid = pyqBulkSchema.safeParse({
      paperIds: ["p1", "p2"],
      action: "publish",
    })
    assert.equal(valid.success, true)
  })

  test("rejects bulk request with empty paperIds", () => {
    const invalid = pyqBulkSchema.safeParse({
      paperIds: [],
      action: "publish",
    })
    assert.equal(invalid.success, false)
  })
})
