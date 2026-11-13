import { prisma } from "@/lib/prisma"
import { AppRole, normalizeAppRole } from "./roles"
import { checkPaperAccess, isPaperPaid } from "@/lib/pyqs/pyq-access"

export type EntitlementReason =
  | "FREE"
  | "PURCHASED"
  | "BATCH_ENROLLED"
  | "SUBSCRIPTION_ACTIVE"
  | "TEACHER_ACCESS"
  | "ADMIN_OVERRIDE"
  | "LOCKED"

export interface EntitlementResult {
  allowed: boolean
  reason: EntitlementReason
  price?: number
  message?: string
}

/**
 * Pure predicate for a single Subscription row.
 * A Pass is active only when: status ACTIVE, endDate in the future, plan not FREE.
 */
export function isActivePaidPass(
  subscription?: {
    status?: string | null
    endDate?: Date | string | null
    plan?: string | null
  } | null,
  now: Date = new Date()
): boolean {
  if (!subscription) return false
  if (subscription.status !== "ACTIVE") return false
  if (!subscription.endDate) return false

  const endDate =
    subscription.endDate instanceof Date ? subscription.endDate : new Date(subscription.endDate)
  if (Number.isNaN(endDate.getTime()) || endDate.getTime() <= now.getTime()) return false

  const plan = (subscription.plan || "").trim().toUpperCase()
  if (!plan || plan === "FREE") return false

  return true
}

/**
 * THE single source of truth for "does this user hold an active Pass?".
 *
 * Rules:
 * - No userId -> false (guests and free users never get access).
 * - Database role ADMIN -> true (platform override).
 * - The legacy `role === "PREMIUM"` shortcut is REMOVED: a PREMIUM role with no
 *   active paid Subscription row is NOT a pass holder.
 * - Otherwise: a Subscription row with status ACTIVE, endDate in the future and
 *   plan != "FREE".
 *
 * Never derive pass entitlement from the session/JWT payload, localStorage or
 * any client-supplied value.
 */
export async function hasActivePass(userId?: string | null): Promise<boolean> {
  if (!userId) return false

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    // Unknown user: no entitlement.
    if (!user) return false

    if (normalizeAppRole(user.role) === "ADMIN") return true

    const now = new Date()
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        endDate: { gt: now },
        plan: { not: "FREE" },
      },
      select: { status: true, endDate: true, plan: true },
    })

    return isActivePaidPass(activeSub, now)
  } catch (err) {
    // Fail closed: a database error must never grant access.
    console.error("[hasActivePass error]:", err)
    return false
  }
}

/**
 * Checks entitlement for taking a CBT test or assessment
 */
export async function checkTestAccess(
  userId: string | undefined,
  testId: string,
  userRole?: AppRole
): Promise<EntitlementResult> {
  const role = userRole || "STUDENT"

  if (!userId) {
    return {
      allowed: false,
      reason: "LOCKED",
      price: 199,
      message: "Please login to attempt this test",
    }
  }

  try {
    const test = await prisma.examTest.findUnique({
      where: { id: testId },
      select: {
        accessMode: true,
        seriesId: true,
        createdById: true,
        series: {
          select: {
            isFree: true,
            isPro: true,
          },
        },
      },
    })

    if (!test) {
      return { allowed: false, reason: "LOCKED", message: "Test not found" }
    }

    // A teacher only has free access to tests they created
    if (test.createdById === userId) {
      return { allowed: true, reason: "TEACHER_ACCESS" }
    }

    // If this test is linked to a paid PYQ paper, apply PYQ pass gate
    const linkedPaper = await prisma.pyqPaper.findFirst({
      where: { cbtTestId: testId },
      select: { id: true, accessType: true, creatorId: true },
    })

    if (linkedPaper && isPaperPaid(linkedPaper.accessType)) {
      const access = await checkPaperAccess({
        userId,
        role,
        paper: linkedPaper,
      })

      if (!access.allowed) {
        return {
          allowed: false,
          reason: "LOCKED",
          message: "This paper needs the AspirantBook Pass.",
        }
      }

      return {
        allowed: true,
        reason:
          access.reason === "PASS"
            ? "SUBSCRIPTION_ACTIVE"
            : access.reason === "ADMIN"
            ? "ADMIN_OVERRIDE"
            : access.reason === "OWNER"
            ? "TEACHER_ACCESS"
            : "PURCHASED",
      }
    }

    // Free tests are accessible to all authenticated users
    if (test.accessMode === "FREE") {
      return { allowed: true, reason: "FREE" }
    }

    // Pass / subscription entitlement. Database only: the old
    // `role === "PREMIUM"` shortcut is gone and the subscription query now
    // requires plan != "FREE".
    if (await hasActivePass(userId)) {
      return { allowed: true, reason: "SUBSCRIPTION_ACTIVE" }
    }

    // Check paid enrollment in the series (PASS or PURCHASED only; FREE cannot unlock PRO tests)
    const enrollment = await prisma.examSeriesEnrollment.findUnique({
      where: {
        userId_seriesId: {
          userId,
          seriesId: test.seriesId,
        },
      },
    })

    if (
      enrollment &&
      enrollment.status === "ACTIVE" &&
      (!enrollment.expiresAt || enrollment.expiresAt > new Date()) &&
      enrollment.enrollType !== "FREE"
    ) {
      return {
        allowed: true,
        reason: enrollment.enrollType === "PASS" ? "SUBSCRIPTION_ACTIVE" : "PURCHASED",
      }
    }

    return {
      allowed: false,
      reason: "LOCKED",
      price: 399,
      message: "Pro test. Please purchase Pass or subscription to unlock.",
    }
  } catch (error) {
    console.error("[checkTestAccess Error]", error)
    return { allowed: false, reason: "LOCKED", message: "Failed to verify test access" }
  }
}

/**
 * Checks entitlement for entering a live classroom
 */
export async function checkLiveClassAccess(
  userId: string | undefined,
  batchSlug: string,
  userRole?: AppRole
): Promise<EntitlementResult> {
  const role = userRole || "STUDENT"

  if (role === "ADMIN") return { allowed: true, reason: "ADMIN_OVERRIDE" }
  if (role === "TEACHER") return { allowed: true, reason: "TEACHER_ACCESS" }

  return { allowed: true, reason: "BATCH_ENROLLED" }
}
