import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { PROTECTED_ROLES, canApplyPaymentRoleChange } from "@/lib/payments/role-safety"
import { upgradeSubscription } from "@/lib/actions/user/subscription"

describe("Payment role safety: pure helper & protected roles", () => {
  it("exports PROTECTED_ROLES containing ADMIN and TEACHER as const", () => {
    assert.deepEqual([...PROTECTED_ROLES], ["ADMIN", "TEACHER"])
  })

  it("canApplyPaymentRoleChange rejects ADMIN and TEACHER", () => {
    assert.equal(canApplyPaymentRoleChange("ADMIN"), false)
    assert.equal(canApplyPaymentRoleChange("TEACHER"), false)
  })

  it("canApplyPaymentRoleChange allows FREE and PREMIUM", () => {
    assert.equal(canApplyPaymentRoleChange("FREE"), true)
    assert.equal(canApplyPaymentRoleChange("PREMIUM"), true)
  })

  it("canApplyPaymentRoleChange safely rejects empty or missing values", () => {
    assert.equal(canApplyPaymentRoleChange(null), false)
    assert.equal(canApplyPaymentRoleChange(undefined), false)
    assert.equal(canApplyPaymentRoleChange(""), false)
  })
})

describe("Payment role safety: guarded role write logic", () => {
  type MockUser = { id: string; role: string; sessionVersion: number }

  // Simulates prisma.user.updateMany({ where: { id, role: { notIn: [...PROTECTED_ROLES] } }, data: { role: "PREMIUM" } })
  function applyGuardedRoleUpgrade(user: MockUser): { count: number; user: MockUser } {
    const isProtected = (PROTECTED_ROLES as readonly string[]).includes(user.role)
    if (isProtected) {
      return { count: 0, user: { ...user } }
    }
    return { count: 1, user: { ...user, role: "PREMIUM" } }
  }

  it("leaves ADMIN role unchanged when payment/subscription completes", () => {
    const adminUser: MockUser = { id: "u-admin", role: "ADMIN", sessionVersion: 1 }
    const result = applyGuardedRoleUpgrade(adminUser)
    assert.equal(result.count, 0)
    assert.equal(result.user.role, "ADMIN")
  })

  it("leaves TEACHER role unchanged when payment/subscription completes", () => {
    const teacherUser: MockUser = { id: "u-teacher", role: "TEACHER", sessionVersion: 1 }
    const result = applyGuardedRoleUpgrade(teacherUser)
    assert.equal(result.count, 0)
    assert.equal(result.user.role, "TEACHER")
  })

  it("upgrades FREE role to PREMIUM when payment/subscription completes", () => {
    const freeUser: MockUser = { id: "u-free", role: "FREE", sessionVersion: 1 }
    const result = applyGuardedRoleUpgrade(freeUser)
    assert.equal(result.count, 1)
    assert.equal(result.user.role, "PREMIUM")
  })
})

describe("Payment role safety: subscription cancellation & demotion logic", () => {
  type MockSubscription = { id: string; userId: string; status: "ACTIVE" | "CANCELED" }
  type MockUser = { id: string; role: string }

  // Simulates the stripe customer.subscription.deleted handler logic
  function handleSimulatedSubscriptionDeleted(
    subToDeleteId: string,
    subscriptions: MockSubscription[],
    users: MockUser[]
  ): { handled: boolean; duplicateNoop: boolean; updatedUserRole?: string } {
    const dbSubscription = subscriptions.find((s) => s.id === subToDeleteId)
    if (!dbSubscription) {
      return { handled: false, duplicateNoop: false }
    }

    // Early return if already CANCELED (idempotent)
    if (dbSubscription.status === "CANCELED") {
      return { handled: true, duplicateNoop: true }
    }

    // Mark canceled
    dbSubscription.status = "CANCELED"

    // Check if user has other ACTIVE subscriptions
    const otherActiveSubscription = subscriptions.find(
      (s) => s.userId === dbSubscription.userId && s.status === "ACTIVE" && s.id !== dbSubscription.id
    )

    const user = users.find((u) => u.id === dbSubscription.userId)
    if (!otherActiveSubscription && user) {
      // Guarded demote: only when user.role === "PREMIUM"
      if (user.role === "PREMIUM") {
        user.role = "FREE"
      }
    }

    return { handled: true, duplicateNoop: false, updatedUserRole: user?.role }
  }

  it("duplicate cancel event is a no-op", () => {
    const subs: MockSubscription[] = [{ id: "sub-1", userId: "u-1", status: "CANCELED" }]
    const users: MockUser[] = [{ id: "u-1", role: "PREMIUM" }]

    const result = handleSimulatedSubscriptionDeleted("sub-1", subs, users)
    assert.equal(result.handled, true)
    assert.equal(result.duplicateNoop, true)
    // User role is not touched
    assert.equal(users[0].role, "PREMIUM")
  })

  it("cancel demotes PREMIUM to FREE only when no other active subscription exists", () => {
    const subs: MockSubscription[] = [{ id: "sub-1", userId: "u-1", status: "ACTIVE" }]
    const users: MockUser[] = [{ id: "u-1", role: "PREMIUM" }]

    const result = handleSimulatedSubscriptionDeleted("sub-1", subs, users)
    assert.equal(result.handled, true)
    assert.equal(result.duplicateNoop, false)
    assert.equal(result.updatedUserRole, "FREE")
    assert.equal(users[0].role, "FREE")
  })

  it("cancel does NOT demote PREMIUM if user still has another active subscription", () => {
    const subs: MockSubscription[] = [
      { id: "sub-1", userId: "u-1", status: "ACTIVE" },
      { id: "sub-2", userId: "u-1", status: "ACTIVE" },
    ]
    const users: MockUser[] = [{ id: "u-1", role: "PREMIUM" }]

    const result = handleSimulatedSubscriptionDeleted("sub-1", subs, users)
    assert.equal(result.handled, true)
    assert.equal(result.duplicateNoop, false)
    assert.equal(users[0].role, "PREMIUM")
  })

  it("cancel never demotes ADMIN or TEACHER even when their subscription is deleted", () => {
    const subs: MockSubscription[] = [
      { id: "sub-admin", userId: "u-admin", status: "ACTIVE" },
      { id: "sub-teacher", userId: "u-teacher", status: "ACTIVE" },
    ]
    const users: MockUser[] = [
      { id: "u-admin", role: "ADMIN" },
      { id: "u-teacher", role: "TEACHER" },
    ]

    handleSimulatedSubscriptionDeleted("sub-admin", subs, users)
    assert.equal(users[0].role, "ADMIN")

    handleSimulatedSubscriptionDeleted("sub-teacher", subs, users)
    assert.equal(users[1].role, "TEACHER")
  })
})

describe("Payment role safety: upgradeSubscription fails closed in production", () => {
  const origNodeEnv = process.env.NODE_ENV

  it("upgradeSubscription returns an error and writes nothing when NODE_ENV is production", async () => {
    try {
      (process.env as any).NODE_ENV = "production"

      const res = await upgradeSubscription("MONTHLY")
      assert.deepEqual(res, {
        success: false,
        error: "Mock subscription upgrade is disabled in production",
      })
    } finally {
      (process.env as any).NODE_ENV = origNodeEnv
    }
  })
})
