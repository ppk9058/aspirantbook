import { prisma } from "@/lib/prisma"
import { normalizeAppRole } from "@/lib/auth/roles"

export type PyqAccessReason =
  | "FREE"
  | "ADMIN"
  | "OWNER"
  | "UNLOCKED"
  | "PASS"
  | "PASS_REQUIRED"
  | "LOGIN_REQUIRED"

export interface CanAccessPaperResult {
  allowed: boolean
  reason: PyqAccessReason
}

/**
 * Returns true if a paper's accessType indicates it requires payment or an active Pass.
 * A paper is paid if accessType is "PAID" or "PASS_ONLY".
 */
export function isPaperPaid(accessType?: string | null): boolean {
  if (!accessType) return false
  const upper = accessType.trim().toUpperCase()
  return upper === "PAID" || upper === "PASS_ONLY"
}

/**
 * Pure decision logic for PYQ paper access.
 * Separated from database lookups so it can be reliably unit tested.
 */
export function canAccessPaidPaper({
  userId,
  role,
  paper,
  hasPass = false,
  hasUnlock = false,
}: {
  userId?: string | null
  role?: string | null
  paper: {
    accessType: string
    creatorId?: string | null
  }
  hasPass?: boolean
  hasUnlock?: boolean
}): CanAccessPaperResult {
  // 1. Free papers are open to everyone (subject to standard authwall behavior)
  if (!isPaperPaid(paper.accessType)) {
    return { allowed: true, reason: "FREE" }
  }

  // 2. Paid papers require authentication
  if (!userId) {
    return { allowed: false, reason: "LOGIN_REQUIRED" }
  }

  // 3. Platform administrators have global override access (includes SUPER_ADMIN)
  const normalizedRole = normalizeAppRole(role)
  if (normalizedRole === "ADMIN") {
    return { allowed: true, reason: "ADMIN" }
  }

  // 4. The teacher who created the paper has author access
  if (normalizedRole === "TEACHER" && paper.creatorId && paper.creatorId === userId) {
    return { allowed: true, reason: "OWNER" }
  }

  // 5. Existing PyqUnlock rows keep working (legacy single-paper unlock)
  if (hasUnlock) {
    return { allowed: true, reason: "UNLOCKED" }
  }

  // 6. Active Pass holder (Subscription status ACTIVE, endDate > now, plan != FREE, or role PREMIUM)
  if (hasPass) {
    return { allowed: true, reason: "PASS" }
  }

  // 7. Otherwise, the paper requires purchasing or activating the Pass
  return { allowed: false, reason: "PASS_REQUIRED" }
}

/**
 * Checks if the user currently holds an active Pass or subscription.
 * Mirrors the active Pass criteria in lib/auth/entitlements.ts (checkTestAccess):
 * - user.role === "PREMIUM" OR
 * - Subscription with status "ACTIVE", endDate in the future, and plan != "FREE".
 */
export async function hasActivePass(userId?: string | null): Promise<boolean> {
  if (!userId) return false

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role === "PREMIUM" || user?.role === "ADMIN") {
      return true
    }

    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        endDate: { gt: new Date() },
        plan: { not: "FREE" },
      },
      select: { id: true },
    })

    return Boolean(activeSub)
  } catch (err) {
    console.error("[hasActivePass error]:", err)
    return false
  }
}

/**
 * Checks whether a user can access a specific PYQ paper, performing DB lookups as needed.
 */
export async function checkPaperAccess({
  userId,
  role,
  paper,
}: {
  userId?: string | null
  role?: string | null
  paper: {
    id: string
    accessType: string
    creatorId?: string | null
  }
}): Promise<CanAccessPaperResult> {
  if (!isPaperPaid(paper.accessType)) {
    return { allowed: true, reason: "FREE" }
  }

  if (!userId) {
    return { allowed: false, reason: "LOGIN_REQUIRED" }
  }

  const normalizedRole = normalizeAppRole(role)
  if (normalizedRole === "ADMIN") {
    return { allowed: true, reason: "ADMIN" }
  }

  if (normalizedRole === "TEACHER" && paper.creatorId && paper.creatorId === userId) {
    return { allowed: true, reason: "OWNER" }
  }

  // Check active Pass
  const passActive = await hasActivePass(userId)
  if (passActive) {
    return { allowed: true, reason: "PASS" }
  }

  // Check legacy unlock record
  const unlock = await prisma.pyqUnlock.findUnique({
    where: {
      userId_paperId: {
        userId,
        paperId: paper.id,
      },
    },
    select: { id: true },
  })

  if (unlock) {
    return { allowed: true, reason: "UNLOCKED" }
  }

  return { allowed: false, reason: "PASS_REQUIRED" }
}
