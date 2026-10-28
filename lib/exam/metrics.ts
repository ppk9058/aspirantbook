import { prisma } from "@/lib/prisma"

export interface MetricDefinition {
  key: string
  label: string
  tooltip: string
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  testsTotal: {
    key: "testsTotal",
    label: "Total Tests",
    tooltip: "All authored tests linked to this package or studio (including drafts and archived tests).",
  },
  testsPublished: {
    key: "testsPublished",
    label: "Published Tests",
    tooltip: "Tests currently live or published and accessible to students subject to tier access.",
  },
  testsDraft: {
    key: "testsDraft",
    label: "Draft Tests",
    tooltip: "Tests currently in draft mode, hidden from student view.",
  },
  testsScheduled: {
    key: "testsScheduled",
    label: "Scheduled Tests",
    tooltip: "Tests configured with live start and end dates waiting to go live.",
  },
  testsArchived: {
    key: "testsArchived",
    label: "Archived Tests",
    tooltip: "Tests archived to preserve student attempt records while hidden from active student catalogs.",
  },
  enrolled: {
    key: "enrolled",
    label: "Active Enrollments",
    tooltip: "Total student accounts currently enrolled across free, pass, and purchased tiers.",
  },
  paid: {
    key: "paid",
    label: "Purchased",
    tooltip: "Students who bought this package directly with verified completed payments.",
  },
  pass: {
    key: "pass",
    label: "Pass Subscriptions",
    tooltip: "Students accessing this series via an active TrillionPass subscription.",
  },
  free: {
    key: "free",
    label: "Free Enrolled",
    tooltip: "Students enrolled via the free access tier.",
  },
  attempts: {
    key: "attempts",
    label: "Total Attempts",
    tooltip: "Total submitted test attempts across all tests in this package (enrolled students plus guest/open attempts).",
  },
  enrolledAttempts: {
    key: "enrolledAttempts",
    label: "Enrolled Attempts",
    tooltip: "Submissions by students who have an active enrollment (Free, Pass, or Purchased) in this package.",
  },
  guestAttempts: {
    key: "guestAttempts",
    label: "Guest Attempts",
    tooltip: "Submissions by unauthenticated guests or unenrolled students taking open/sample preview tests without a package enrollment.",
  },
  uniqueStudents: {
    key: "uniqueStudents",
    label: "Unique Students",
    tooltip: "Number of distinct students who have completed at least one attempt in this series.",
  },
  avgScorePct: {
    key: "avgScorePct",
    label: "Class Average",
    tooltip: "Average score percentage across first completed student attempts (Score / Total Marks * 100).",
  },
}

/**
 * Filter to exclude staff, teachers, admins, and synthetic test accounts from analytics.
 */
export function getAnalyticsUserWhere(includeStaff = false) {
  if (includeStaff) {
    return {}
  }
  return {
    role: { notIn: ["ADMIN", "TEACHER"] },
    NOT:
      process.env.APP_ENV === "test"
        ? [{ email: { contains: "dummy" } }]
        : [
            { email: { endsWith: "@test.local" } },
            { email: { contains: "dummy" } },
          ],
  }
}

export interface PackageAuthoritativeMetrics {
  testsTotal: number
  testsPublished: number
  testsDraft: number
  testsScheduled: number
  testsArchived: number
  enrolled: number
  paid: number
  pass: number
  free: number
  attempts: number
  enrolledAttempts?: number
  guestAttempts: number
  uniqueStudents: number
  avgScore: number // percentage 0-100
}

/**
 * Computes unified authoritative metrics for an ExamSeries package.
 */
export async function computeAuthoritativePackageMetrics(
  seriesId: string,
  options: { includeStaff?: boolean } = {}
): Promise<PackageAuthoritativeMetrics> {
  const includeStaff = Boolean(options.includeStaff)

  // Resolve both id and slug so we match regardless of whether seriesId or seriesSlug was provided
  const seriesRecord = await prisma.examSeries.findFirst({
    where: {
      OR: [{ id: seriesId }, { slug: seriesId }],
    },
    select: { id: true, slug: true },
  })

  const matchingSeriesIds = seriesRecord
    ? Array.from(new Set([seriesRecord.id, seriesRecord.slug].filter(Boolean)))
    : [seriesId]

  // 1. Tests breakdown
  const tests = await prisma.examTest.findMany({
    where: { seriesId: { in: matchingSeriesIds } },
    select: {
      id: true,
      isPublished: true,
      isArchived: true,
      isLive: true,
      liveStartAt: true,
      liveEndAt: true,
      totalMarks: true,
    },
  })

  const testsTotal = tests.length
  const testsArchived = tests.filter((t) => t.isArchived).length
  const nonArchivedTests = tests.filter((t) => !t.isArchived)
  const testsPublished = nonArchivedTests.filter((t) => t.isPublished).length
  const testsDraft = nonArchivedTests.filter((t) => !t.isPublished).length

  const now = new Date()
  const testsScheduled = nonArchivedTests.filter(
    (t) => t.isLive && t.liveStartAt && t.liveStartAt > now
  ).length

  const testIds = tests.map((t) => t.id)
  const testMarksMap = new Map<string, number>(tests.map((t) => [t.id, t.totalMarks || 100]))

  // 2. Enrollments breakdown
  const enrollments = await prisma.examSeriesEnrollment.findMany({
    where: { seriesId: { in: matchingSeriesIds }, status: "ACTIVE" },
    select: { id: true, userId: true, enrollType: true, orderId: true },
  })

  const enrolled = enrollments.length
  const free = enrollments.filter((e) => e.enrollType === "FREE").length
  const pass = enrollments.filter((e) => e.enrollType === "PASS").length

  const purchasedEnrollments = enrollments.filter((e) => e.enrollType === "PURCHASED")
  let paid = 0

  if (purchasedEnrollments.length > 0) {
    const orderIds = purchasedEnrollments
      .map((e) => e.orderId)
      .filter((id): id is string => Boolean(id))

    if (orderIds.length > 0) {
      const completedPayments = await prisma.payment.findMany({
        where: {
          status: "COMPLETED",
          OR: [
            { razorpayOrderId: { in: orderIds } },
            { externalId: { in: orderIds } },
            { id: { in: orderIds } },
          ],
        },
        select: { id: true, razorpayOrderId: true, externalId: true },
      })

      for (const enrollment of purchasedEnrollments) {
        if (!enrollment.orderId) continue
        const isPaid = completedPayments.some(
          (p) =>
            p.razorpayOrderId === enrollment.orderId ||
            p.externalId === enrollment.orderId ||
            p.id === enrollment.orderId
        )
        if (isPaid) paid += 1
      }
    }
  }

  // 3. Student Submissions & Guest Attempts
  let attempts = 0
  let enrolledAttempts = 0
  let guestAttempts = 0
  let uniqueStudents = 0
  let avgScore = 0

  if (testIds.length > 0) {
    const allAttempts = await prisma.examAttempt.findMany({
      where: {
        testId: { in: testIds },
        status: "SUBMITTED",
      },
      select: {
        id: true,
        userId: true,
        testId: true,
        score: true,
        user: {
          select: {
            id: true,
            role: true,
            email: true,
          },
        },
      },
      orderBy: [{ submittedAt: "asc" }, { startedAt: "asc" }],
    })

    const enrolledUserIds = new Set(enrollments.map((e) => e.userId))
    const qualifyingStudentAttempts: typeof allAttempts = []

    let enrolledCount = 0
    let guestCount = 0

    for (const att of allAttempts) {
      const user = att.user
      const isStaff = user?.role === "ADMIN" || user?.role === "TEACHER"
      const isTestEmail =
        process.env.APP_ENV !== "test" && Boolean(user?.email?.endsWith("@test.local"))

      if (!includeStaff && (isStaff || isTestEmail)) {
        continue
      }

      qualifyingStudentAttempts.push(att)

      // Categorize enrolled student attempts vs guest / unenrolled open attempts
      if (user?.id && enrolledUserIds.has(user.id)) {
        enrolledCount += 1
      } else {
        guestCount += 1
      }
    }

    enrolledAttempts = enrolledCount
    guestAttempts = guestCount
    // Total attempts across all student takers (enrolled + guest)
    attempts = qualifyingStudentAttempts.length
    const studentUserIds = new Set(
      qualifyingStudentAttempts.map((a) => a.userId).filter(Boolean)
    )
    uniqueStudents = studentUserIds.size

    // Average score percentage calculation on first attempts across all qualifying attempts
    const attemptsForAvg = qualifyingStudentAttempts.length > 0 ? qualifyingStudentAttempts : allAttempts
    const firstAttemptPct = new Map<string, number>()
    for (const att of attemptsForAvg) {
      const key = `${att.userId}:${att.testId}`
      if (!firstAttemptPct.has(key)) {
        const totalMarks = testMarksMap.get(att.testId) || 100
        const pct = totalMarks > 0 ? (Math.max(0, att.score) / totalMarks) * 100 : 0
        firstAttemptPct.set(key, Math.min(100, Math.round(pct * 10) / 10))
      }
    }

    const pcts = Array.from(firstAttemptPct.values())
    if (pcts.length > 0) {
      avgScore = Math.round((pcts.reduce((sum, p) => sum + p, 0) / pcts.length) * 10) / 10
    }
  }

  return {
    testsTotal,
    testsPublished,
    testsDraft,
    testsScheduled,
    testsArchived,
    enrolled,
    paid,
    pass,
    free,
    attempts,
    enrolledAttempts,
    guestAttempts,
    uniqueStudents,
    avgScore,
  }
}

/**
 * Filter predicate to check if a user is an authentic student for analytics purposes.
 */
export function isAnalyticsUser(user?: { role?: string; email?: string } | null): boolean {
  if (!user) return false
  if (user.role === "ADMIN" || user.role === "TEACHER") return false
  if (user.email) {
    const email = user.email.toLowerCase()
    if (
      (process.env.APP_ENV !== "test" && email.endsWith("@test.local")) ||
      email.includes("dummy") ||
      email.includes("test-bot")
    ) {
      return false
    }
  }
  return true
}

/**
 * Pure helper to compute summary metrics from an array of tests.
 */
export function calculatePackageMetricsSummary(
  tests: Array<{ isPublished?: boolean; isArchived?: boolean; attempts?: number; marks?: number }> = []
) {
  const total = tests.length
  const archived = tests.filter((t) => Boolean(t.isArchived)).length
  const nonArchived = tests.filter((t) => !t.isArchived)
  const published = nonArchived.filter((t) => Boolean(t.isPublished)).length
  const draft = nonArchived.filter((t) => !t.isPublished).length
  const attempts = tests.reduce((sum, t) => sum + (t.attempts || 0), 0)
  return { total, published, draft, archived, attempts }
}

/**
 * Pure helper to compute package-level metrics from a series object with nested tests and attempts.
 */
export function computePackageMetrics(
  series: { id: string; tests?: Array<any> },
  includeStaff = false
) {
  const tests = series.tests || []
  const testsTotal = tests.length
  const nonArchived = tests.filter((t) => !t.isArchived)
  const testsPublished = nonArchived.filter((t) => t.isPublished).length

  const allAttempts: Array<any> = []
  for (const t of tests) {
    if (Array.isArray(t.attempts)) {
      for (const a of t.attempts) {
        allAttempts.push({ ...a, testTotalMarks: t.marks || t.totalMarks || 100 })
      }
    }
  }

  const qualifyingAttempts = allAttempts.filter((att) => {
    if (includeStaff) return true
    return isAnalyticsUser(att.user)
  })

  const attemptsTotal = qualifyingAttempts.length
  const uniqueStudents = new Set(
    qualifyingAttempts.map((a) => a.userId || a.user?.id || a.user?.email).filter(Boolean)
  ).size

  const totalScore = qualifyingAttempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0)
  const classAverageScore = attemptsTotal > 0 ? Math.round((totalScore / attemptsTotal) * 10) / 10 : 0

  const totalMaxMarks = qualifyingAttempts.reduce((sum, a) => sum + (Number(a.testTotalMarks) || 100), 0)
  const classAveragePercentage = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 1000) / 10 : 0

  return {
    testsTotal,
    testsPublished,
    attemptsTotal,
    uniqueStudents,
    classAverageScore,
    classAveragePercentage,
  }
}
