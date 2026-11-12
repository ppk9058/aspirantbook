import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { z } from "zod"

const contentEngineArchiveSchema = z.object({
  isArchived: z.boolean().optional(),
  status: z.enum(["ARCHIVED", "PUBLISHED", "DRAFT"]).optional(),
})

const contentEngineBulkSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "archive", "delete", "restore"]),
})

function verifyContentEngineAdminOnly(user: { isAuthenticated: boolean; role?: string } | null) {
  if (!user || !user.isAuthenticated) {
    return { authorized: false, status: 401, error: "Unauthorized" }
  }
  if (user.role !== "ADMIN") {
    return {
      authorized: false,
      status: 403,
      error: "Access Denied: Admin role required for Content Engine Studio",
    }
  }
  return { authorized: true, status: 200 }
}

function verifyContentEngineDeleteGuard({
  status,
  isPublished,
  translationsCount = 0,
  hasOverride = false,
}: {
  status: string
  isPublished: boolean
  translationsCount?: number
  hasOverride?: boolean
}) {
  if (status === "PUBLISHED" || isPublished) {
    return {
      canDelete: false,
      status: 409,
      error: "Published questions cannot be hard deleted. Archive the question instead.",
      translationsCount,
      hasOverride,
    }
  }
  return {
    canDelete: true,
    status: 200,
    translationsCount,
    hasOverride,
  }
}

function verifyPublicQuestionVisibility(question: {
  status: string
  isPublished: boolean
}) {
  if (question.status === "ARCHIVED" || !question.isPublished) {
    return { isVisibleOnPublicRoutes: false }
  }
  return { isVisibleOnPublicRoutes: true }
}

describe("Content Engine Studio Admin Role Checks", () => {
  test("rejects unauthenticated user with 401", () => {
    const res = verifyContentEngineAdminOnly(null)
    assert.equal(res.authorized, false)
    assert.equal(res.status, 401)
  })

  test("rejects student role with 403", () => {
    const res = verifyContentEngineAdminOnly({ isAuthenticated: true, role: "STUDENT" })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
  })

  test("rejects teacher role with 403 (admin only studio)", () => {
    const res = verifyContentEngineAdminOnly({ isAuthenticated: true, role: "TEACHER" })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
    assert.ok(res.error?.includes("Admin role required"))
  })

  test("authorizes admin user", () => {
    const res = verifyContentEngineAdminOnly({ isAuthenticated: true, role: "ADMIN" })
    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
  })
})

describe("Content Engine Hard Delete vs Archive Protection (409 Guard)", () => {
  test("refuses hard delete with 409 for PUBLISHED question and reports impact", () => {
    const guard = verifyContentEngineDeleteGuard({
      status: "PUBLISHED",
      isPublished: true,
      translationsCount: 2,
      hasOverride: true,
    })
    assert.equal(guard.canDelete, false)
    assert.equal(guard.status, 409)
    assert.equal(guard.translationsCount, 2)
    assert.equal(guard.hasOverride, true)
    assert.ok(guard.error && guard.error.includes("Published questions cannot be hard deleted"))
  })

  test("allows hard delete for DRAFT question", () => {
    const guard = verifyContentEngineDeleteGuard({
      status: "DRAFT",
      isPublished: false,
      translationsCount: 1,
      hasOverride: false,
    })
    assert.equal(guard.canDelete, true)
    assert.equal(guard.status, 200)
    assert.equal(guard.translationsCount, 1)
  })

  test("allows hard delete for ARCHIVED question", () => {
    const guard = verifyContentEngineDeleteGuard({
      status: "ARCHIVED",
      isPublished: false,
      translationsCount: 0,
      hasOverride: false,
    })
    assert.equal(guard.canDelete, true)
    assert.equal(guard.status, 200)
  })
})

describe("Content Engine Public Route Visibility Guard", () => {
  test("archived question is not visible on /question-answer or /hi/question-answer", () => {
    const vis = verifyPublicQuestionVisibility({
      status: "ARCHIVED",
      isPublished: false,
    })
    assert.equal(vis.isVisibleOnPublicRoutes, false)
  })

  test("draft question is not visible on public routes", () => {
    const vis = verifyPublicQuestionVisibility({
      status: "DRAFT",
      isPublished: false,
    })
    assert.equal(vis.isVisibleOnPublicRoutes, false)
  })

  test("published question is visible on public routes", () => {
    const vis = verifyPublicQuestionVisibility({
      status: "PUBLISHED",
      isPublished: true,
    })
    assert.equal(vis.isVisibleOnPublicRoutes, true)
  })
})

describe("Content Engine Payload Validation", () => {
  test("validates archive request payload", () => {
    const valid = contentEngineArchiveSchema.safeParse({ isArchived: true })
    assert.equal(valid.success, true)
  })

  test("validates bulk request payload", () => {
    const valid = contentEngineBulkSchema.safeParse({
      questionIds: ["q-1", "q-2"],
      action: "archive",
    })
    assert.equal(valid.success, true)
  })

  test("rejects invalid bulk action", () => {
    const invalid = contentEngineBulkSchema.safeParse({
      questionIds: ["q-1"],
      action: "purge",
    })
    assert.equal(invalid.success, false)
  })
})
