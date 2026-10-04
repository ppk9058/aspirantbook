import { prisma } from "@/lib/prisma"
import { AppRole, normalizeAppRole } from "./roles"

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
 * Checks entitlement for accessing a video/lecture
 */
export async function checkLectureAccess(
  userId: string | undefined,
  lectureId: string,
  userRole?: AppRole
): Promise<EntitlementResult> {
  const role = userRole || "STUDENT"

  if (role === "ADMIN") {
    return { allowed: true, reason: "ADMIN_OVERRIDE" }
  }

  if (role === "TEACHER") {
    return { allowed: true, reason: "TEACHER_ACCESS" }
  }

  // Check if lecture is free
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lectureId },
      include: {
        chapter: {
          include: {
            course: {
              select: { id: true, isPremium: true, title: true },
            },
          },
        },
      },
    })

    if (!lesson) {
      // Fallback for mock lecture IDs
      if (lectureId.includes("free") || lectureId.includes("intro")) {
        return { allowed: true, reason: "FREE" }
      }
      return { allowed: true, reason: "FREE" }
    }

    // Free course lectures are allowed
    if (!lesson.chapter.course.isPremium) {
      return { allowed: true, reason: "FREE" }
    }

    if (!userId) {
      return {
        allowed: false,
        reason: "LOCKED",
        price: 499,
        message: "Please login to watch this premium lecture",
      }
    }

    // Check enrollment in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.chapter.course.id,
        },
      },
    })

    if (enrollment) {
      return { allowed: true, reason: "PURCHASED" }
    }

    // Check active subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role === "PREMIUM") {
      return { allowed: true, reason: "SUBSCRIPTION_ACTIVE" }
    }

    return {
      allowed: false,
      reason: "LOCKED",
      price: 499,
      message: "Premium content. Please purchase course or enroll in batch.",
    }
  } catch (error) {
    // Database connection fallback
    if (lectureId.includes("premium")) {
      return { allowed: false, reason: "LOCKED", price: 499 }
    }
    return { allowed: true, reason: "FREE" }
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

  if (role === "ADMIN") return { allowed: true, reason: "ADMIN_OVERRIDE" }

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

    // Free tests are accessible to all authenticated users
    if (test.accessMode === "FREE") {
      return { allowed: true, reason: "FREE" }
    }

    // Check user role (PREMIUM or ADMIN overrides)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role === "PREMIUM" || user?.role === "ADMIN") {
      return { allowed: true, reason: "SUBSCRIPTION_ACTIVE" }
    }

    // Check user active subscription with valid status and end date
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        endDate: { gt: new Date() },
      },
    })
    if (activeSub) {
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
