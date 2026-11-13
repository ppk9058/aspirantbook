import { describe, it, afterEach } from "node:test"
import assert from "node:assert/strict"
import { hasActivePass, isActivePaidPass, checkTestAccess } from "@/lib/auth/entitlements"
import { hasActivePass as pyqHasActivePass } from "@/lib/pyqs/pyq-access"
import { prisma } from "@/lib/prisma"

/**
 * Pass entitlement must come from the DATABASE only, through one helper:
 * hasActivePass(userId).
 *
 * Rules under test:
 * - no userId -> false
 * - role ADMIN -> true
 * - the legacy role === "PREMIUM" shortcut is REMOVED
 * - otherwise true only for Subscription { status: ACTIVE, endDate > now, plan != "FREE" }
 */

const origUserFindUnique = prisma.user.findUnique
const origSubscriptionFindFirst = prisma.subscription.findFirst
const origExamTestFindUnique = prisma.examTest.findUnique
const origPyqPaperFindFirst = prisma.pyqPaper.findFirst
const origEnrollmentFindUnique = prisma.examSeriesEnrollment.findUnique

afterEach(() => {
  ;(prisma.user as any).findUnique = origUserFindUnique
  ;(prisma.subscription as any).findFirst = origSubscriptionFindFirst
  ;(prisma.examTest as any).findUnique = origExamTestFindUnique
  ;(prisma.pyqPaper as any).findFirst = origPyqPaperFindFirst
  ;(prisma.examSeriesEnrollment as any).findUnique = origEnrollmentFindUnique
})

function mockUser(role: string | null) {
  ;(prisma.user as any).findUnique = async () => (role ? { role } : null)
}

function mockSubscription(sub: any) {
  ;(prisma.subscription as any).findFirst = async () => sub
}

describe("isActivePaidPass: pure subscription predicate", () => {
  const now = new Date("2026-01-01T00:00:00.000Z")

  it("accepts an ACTIVE paid plan that ends in the future", () => {
    assert.equal(
      isActivePaidPass(
        { status: "ACTIVE", endDate: new Date("2027-01-01T00:00:00.000Z"), plan: "YEARLY" },
        now
      ),
      true
    )
  })

  it("rejects an expired subscription", () => {
    assert.equal(
      isActivePaidPass(
        { status: "ACTIVE", endDate: new Date("2025-12-31T00:00:00.000Z"), plan: "YEARLY" },
        now
      ),
      false
    )
  })

  it("rejects a FREE plan row, even when ACTIVE and in the future", () => {
    assert.equal(
      isActivePaidPass(
        { status: "ACTIVE", endDate: new Date("2027-01-01T00:00:00.000Z"), plan: "FREE" },
        now
      ),
      false
    )
  })

  it("rejects non-ACTIVE statuses", () => {
    assert.equal(
      isActivePaidPass(
        { status: "CANCELLED", endDate: new Date("2027-01-01T00:00:00.000Z"), plan: "YEARLY" },
        now
      ),
      false
    )
  })

  it("rejects a missing subscription row", () => {
    assert.equal(isActivePaidPass(null, now), false)
    assert.equal(isActivePaidPass(undefined, now), false)
  })
})

describe("hasActivePass: database-only pass entitlement", () => {
  it("guest (no userId) is false and never touches the database", async () => {
    let called = false
    ;(prisma.user as any).findUnique = async () => {
      called = true
      return { role: "PREMIUM" }
    }
    assert.equal(await hasActivePass(undefined), false)
    assert.equal(await hasActivePass(null), false)
    assert.equal(await hasActivePass(""), false)
    assert.equal(called, false, "no userId must short-circuit before any query")
  })

  it("free user (STUDENT, no subscription row) is false", async () => {
    mockUser("STUDENT")
    mockSubscription(null)
    assert.equal(await hasActivePass("free-user-1"), false)
  })

  it("expired subscription is false", async () => {
    mockUser("STUDENT")
    // The database filter (endDate > now) excludes it; emulate that with null.
    mockSubscription(null)
    assert.equal(await hasActivePass("expired-user-1"), false)
  })

  it("plan FREE subscription is false", async () => {
    mockUser("STUDENT")
    mockSubscription({ status: "ACTIVE", endDate: new Date(Date.now() + 86400000), plan: "FREE" })
    assert.equal(await hasActivePass("free-plan-user-1"), false)
  })

  it("role PREMIUM without a subscription row is false (shortcut removed)", async () => {
    mockUser("PREMIUM")
    mockSubscription(null)
    assert.equal(await hasActivePass("premium-role-no-sub"), false)
  })

  it("role ADMIN is true", async () => {
    mockUser("ADMIN")
    // ADMIN must not even need a subscription query.
    let subQueried = false
    ;(prisma.subscription as any).findFirst = async () => {
      subQueried = true
      return null
    }
    assert.equal(await hasActivePass("admin-user-1"), true)
    assert.equal(subQueried, false, "ADMIN override must not depend on a subscription row")
  })

  it("active paid subscription is true and the query filters ACTIVE + future + plan != FREE", async () => {
    mockUser("STUDENT")
    let capturedArgs: any = null
    ;(prisma.subscription as any).findFirst = async (args: any) => {
      capturedArgs = args
      return { status: "ACTIVE", endDate: new Date(Date.now() + 86400000), plan: "YEARLY" }
    }

    assert.equal(await hasActivePass("paid-user-1"), true)
    assert.ok(capturedArgs, "subscription lookup must run")
    assert.equal(capturedArgs.where.userId, "paid-user-1")
    assert.equal(capturedArgs.where.status, "ACTIVE")
    assert.ok(capturedArgs.where.endDate.gt instanceof Date, "endDate.gt must be a Date")
    assert.deepEqual(capturedArgs.where.plan, { not: "FREE" })
  })

  it("unknown user row is false", async () => {
    mockUser(null)
    mockSubscription({ status: "ACTIVE", endDate: new Date(Date.now() + 86400000), plan: "YEARLY" })
    assert.equal(await hasActivePass("ghost-user-1"), false)
  })

  it("database errors fail closed", async () => {
    ;(prisma.user as any).findUnique = async () => {
      throw new Error("connection lost")
    }
    assert.equal(await hasActivePass("db-error-user"), false)
  })

  it("the PYQ module delegates to the same helper (one source of truth)", async () => {
    mockUser("STUDENT")
    mockSubscription({ status: "ACTIVE", endDate: new Date(Date.now() + 86400000), plan: "YEARLY" })
    assert.equal(await pyqHasActivePass("paid-user-1"), true)

    mockUser("PREMIUM")
    mockSubscription(null)
    assert.equal(await pyqHasActivePass("premium-role-no-sub"), false)
  })
})

describe("checkTestAccess: uses the same database pass check", () => {
  function mockProTest() {
    ;(prisma.examTest as any).findUnique = async () => ({
      accessMode: "PRO",
      seriesId: "series-1",
      createdById: "author-1",
      series: { isFree: false, isPro: true },
    })
    ;(prisma.pyqPaper as any).findFirst = async () => null
    ;(prisma.examSeriesEnrollment as any).findUnique = async () => null
  }

  it("denies a PREMIUM role user with no subscription (no role shortcut)", async () => {
    mockProTest()
    mockUser("PREMIUM")
    mockSubscription(null)
    const res = await checkTestAccess("premium-no-sub", "test-1", "PREMIUM" as any)
    assert.equal(res.allowed, false)
  })

  it("denies a FREE plan subscription on a PRO test", async () => {
    mockProTest()
    mockUser("STUDENT")
    mockSubscription({ status: "ACTIVE", endDate: new Date(Date.now() + 86400000), plan: "FREE" })
    const res = await checkTestAccess("free-plan-user", "test-1", "STUDENT" as any)
    assert.equal(res.allowed, false)
  })

  it("allows an active paid subscription on a PRO test", async () => {
    mockProTest()
    mockUser("STUDENT")
    mockSubscription({ status: "ACTIVE", endDate: new Date(Date.now() + 86400000), plan: "YEARLY" })
    const res = await checkTestAccess("paid-user", "test-1", "STUDENT" as any)
    assert.equal(res.allowed, true)
    assert.equal(res.reason, "SUBSCRIPTION_ACTIVE")
  })
})
