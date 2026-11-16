import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { z } from "zod"

const bookArchiveSchema = z.object({
  isArchived: z.boolean().optional(),
  status: z.enum(["archived", "published", "draft", "pending"]).optional(),
})

const bookBulkSchema = z.object({
  bookIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "unpublish", "archive", "restore", "delete", "reject"]),
})

function verifyBookAuth({
  user,
  bookCreatorId,
  action,
}: {
  user: { isAuthenticated: boolean; role?: string; userId?: string } | null
  bookCreatorId?: string | null
  action?: string
}) {
  if (!user || !user.isAuthenticated) {
    return { authorized: false, status: 401, error: "Unauthorized" }
  }
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return { authorized: false, status: 403, error: "Forbidden: Admin or Teacher required" }
  }
  // Admin-only actions: publish or reject
  if ((action === "publish" || action === "reject") && user.role !== "ADMIN") {
    return {
      authorized: false,
      status: 403,
      error: "Access Denied: Only Admins can approve or reject books",
    }
  }
  // Teacher ownership check
  if (user.role === "TEACHER" && bookCreatorId && bookCreatorId !== user.userId) {
    return {
      authorized: false,
      status: 403,
      error: "Access Denied: Teachers can only modify their own books",
    }
  }
  return { authorized: true, status: 200 }
}

function verifyBookDeleteGuard({ orderCount }: { orderCount: number }) {
  if (orderCount > 0) {
    return {
      canDelete: false,
      status: 409,
      orderCount,
      error: "Cannot delete book referenced by existing orders. Archive instead.",
    }
  }
  return { canDelete: true, status: 200 }
}

function verifyBookPurchasable(book: { id: string; title: string; status?: string }) {
  if (book.status && book.status !== "published") {
    return {
      purchasable: false,
      status: 400,
      error: `eBook "${book.title}" is archived or unavailable for purchase.`,
    }
  }
  return { purchasable: true, status: 200 }
}

function verifyDownloadAccess({
  userId,
  userRole,
  bookAuthorId,
  purchasedBookIds,
  targetBookId,
}: {
  userId?: string
  userRole?: string
  bookAuthorId?: string
  purchasedBookIds: string[]
  targetBookId: string
}) {
  if (userRole === "ADMIN") return { hasAccess: true, status: 200 }
  if (userRole === "TEACHER" && userId === bookAuthorId) return { hasAccess: true, status: 200 }
  if (purchasedBookIds.includes(targetBookId)) return { hasAccess: true, status: 200 }
  return { hasAccess: false, status: 403, error: "Access Denied: You must purchase this eBook" }
}

describe("Book Studio Auth & Role Verification", () => {
  test("rejects unauthenticated request with 401", () => {
    const res = verifyBookAuth({ user: null })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 401)
  })

  test("rejects student role with 403", () => {
    const res = verifyBookAuth({
      user: { isAuthenticated: true, role: "STUDENT", userId: "stu-1" },
    })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
  })

  test("blocks teacher from self-publishing books (admin approval required)", () => {
    const res = verifyBookAuth({
      user: { isAuthenticated: true, role: "TEACHER", userId: "teacher-1" },
      bookCreatorId: "teacher-1",
      action: "publish",
    })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
    assert.ok(res.error?.includes("Only Admins can approve"))
  })

  test("blocks teacher from modifying another author's book with 403", () => {
    const res = verifyBookAuth({
      user: { isAuthenticated: true, role: "TEACHER", userId: "teacher-1" },
      bookCreatorId: "teacher-2",
    })
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
  })

  test("authorizes teacher modifying their own book", () => {
    const res = verifyBookAuth({
      user: { isAuthenticated: true, role: "TEACHER", userId: "teacher-1" },
      bookCreatorId: "teacher-1",
      action: "draft",
    })
    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
  })

  test("admin has full access to publish and manage any book", () => {
    const res = verifyBookAuth({
      user: { isAuthenticated: true, role: "ADMIN", userId: "admin-1" },
      bookCreatorId: "teacher-2",
      action: "publish",
    })
    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
  })
})

describe("Book Studio Delete Guard & Dependency Protection", () => {
  test("refuses hard delete with 409 when orders reference the book", () => {
    const guard = verifyBookDeleteGuard({ orderCount: 4 })
    assert.equal(guard.canDelete, false)
    assert.equal(guard.status, 409)
    assert.equal(guard.orderCount, 4)
    assert.ok(guard.error.includes("Archive instead"))
  })

  test("allows hard delete when no orders reference the book", () => {
    const guard = verifyBookDeleteGuard({ orderCount: 0 })
    assert.equal(guard.canDelete, true)
    assert.equal(guard.status, 200)
  })
})

describe("Archived Book Public Visibility & Download Access", () => {
  test("checkout blocks purchasing an archived book with 400", () => {
    const check = verifyBookPurchasable({
      id: "b1",
      title: "History of Bihar",
      status: "archived",
    })
    assert.equal(check.purchasable, false)
    assert.equal(check.status, 400)
    assert.ok(check.error && check.error.includes("archived or unavailable"))
  })

  test("checkout allows purchasing published book", () => {
    const check = verifyBookPurchasable({
      id: "b2",
      title: "Geography Compendium",
      status: "published",
    })
    assert.equal(check.purchasable, true)
    assert.equal(check.status, 200)
  })

  test("buyer can download a previously purchased book even when it is archived", () => {
    const check = verifyDownloadAccess({
      userId: "buyer-1",
      userRole: "STUDENT",
      bookAuthorId: "teacher-1",
      purchasedBookIds: ["archived-book-101"],
      targetBookId: "archived-book-101",
    })
    assert.equal(check.hasAccess, true)
    assert.equal(check.status, 200)
  })

  test("unauthorized user cannot download an archived book without purchase", () => {
    const check = verifyDownloadAccess({
      userId: "buyer-2",
      userRole: "STUDENT",
      bookAuthorId: "teacher-1",
      purchasedBookIds: ["other-book-999"],
      targetBookId: "archived-book-101",
    })
    assert.equal(check.hasAccess, false)
    assert.equal(check.status, 403)
  })
})

describe("Book Studio Payload Validation", () => {
  test("validates archive status in bookArchiveSchema", () => {
    const valid = bookArchiveSchema.safeParse({ status: "archived" })
    assert.equal(valid.success, true)
  })

  test("validates bulk actions schema", () => {
    const valid = bookBulkSchema.safeParse({
      bookIds: ["b1", "b2"],
      action: "archive",
    })
    assert.equal(valid.success, true)
  })
})
