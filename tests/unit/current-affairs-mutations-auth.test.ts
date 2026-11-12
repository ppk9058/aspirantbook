import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { z } from "zod"

const caArchiveSchema = z.object({
  isArchived: z.boolean().optional(),
  status: z.enum(["ARCHIVED", "PUBLISHED", "DRAFT"]).optional(),
})

const caBulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "unpublish", "archive", "restore"]),
})

function verifyCurrentAffairsAuth({
  user,
  createdById,
}: {
  user: { isAuthenticated: boolean; role?: string; userId?: string } | null
  createdById?: string | null
}) {
  if (!user || !user.isAuthenticated) {
    return { authorized: false, status: 401, error: "Unauthorized" }
  }
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return { authorized: false, status: 403, error: "Forbidden: Admin or Teacher required" }
  }
  if (user.role === "TEACHER" && createdById && createdById !== user.userId) {
    return {
      authorized: false,
      status: 403,
      error: "Access Denied: You can only modify your own documents",
    }
  }
  return { authorized: true, status: 200 }
}

describe("Current Affairs Studio Auth & Role Verification", () => {
  test("rejects unauthenticated request with 401", () => {
    const res = verifyCurrentAffairsAuth({ user: null })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 401)
  })

  test("rejects student role with 403", () => {
    const res = verifyCurrentAffairsAuth({
      user: { isAuthenticated: true, role: "STUDENT", userId: "stu-1" },
    })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
  })

  test("blocks teacher modifying another author's document with 403", () => {
    const res = verifyCurrentAffairsAuth({
      user: { isAuthenticated: true, role: "TEACHER", userId: "teacher-1" },
      createdById: "teacher-2",
    })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
  })

  test("authorizes teacher modifying their own document", () => {
    const res = verifyCurrentAffairsAuth({
      user: { isAuthenticated: true, role: "TEACHER", userId: "teacher-1" },
      createdById: "teacher-1",
    })
    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
  })

  test("admin bypasses teacher ownership check", () => {
    const res = verifyCurrentAffairsAuth({
      user: { isAuthenticated: true, role: "ADMIN", userId: "admin-1" },
      createdById: "teacher-2",
    })
    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
  })
})

describe("Current Affairs Studio Payload Validation", () => {
  test("validates archive request schema", () => {
    const valid = caArchiveSchema.safeParse({ isArchived: true })
    assert.equal(valid.success, true)
  })

  test("validates restore with explicit status", () => {
    const valid = caArchiveSchema.safeParse({ status: "PUBLISHED" })
    assert.equal(valid.success, true)
  })

  test("validates bulk actions schema", () => {
    const valid = caBulkSchema.safeParse({
      ids: ["ca-1", "ca-2"],
      action: "archive",
    })
    assert.equal(valid.success, true)
  })

  test("rejects invalid bulk action", () => {
    const invalid = caBulkSchema.safeParse({
      ids: ["ca-1"],
      action: "destroy",
    })
    assert.equal(invalid.success, false)
  })
})
