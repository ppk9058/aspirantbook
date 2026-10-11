import { prisma } from "./prisma"
import { getTestRankings } from "./exam-ranking"

export interface PackageMetrics {
  testsTotal: number
  testsPublished: number
  enrolled: number
  paid: number
  pass: number
  free: number
  attempts: number
  uniqueStudents: number
  avgScore: number
}

export interface PackageSummary {
  id: string
  slug: string
  title: string
  description: string | null
  category: string
  examName: string | null
  isPublished: boolean
  createdById: string | null
  createdAt: string
  metrics: PackageMetrics
}

export interface PackageTestItem {
  id: string
  title: string
  totalQuestions: number
  durationMinutes: number
  totalMarks: number
  isPublished: boolean
  attemptsCount: number
  avgScore: number
  topRanks: {
    rank: number
    name: string
    avatar: string | null
    score: number
    accuracy: number
    timeTakenSecs: number
  }[]
}

export interface PackageDetail extends PackageSummary {
  tests: PackageTestItem[]
}

/**
 * Computes authoritative metrics for an ExamSeries package:
 * - testsTotal: total tests linked to this series
 * - testsPublished: published tests linked to this series
 * - enrolled: total ACTIVE enrollments
 * - free: ACTIVE enrollments with enrollType === "FREE"
 * - pass: ACTIVE enrollments with enrollType === "PASS"
 * - paid: ACTIVE enrollments with enrollType === "PURCHASED" whose linked Payment has status === "COMPLETED"
 *         Joined via (orderId === Payment.razorpayOrderId / externalId / id) OR (Payment.userId + Payment.metadata.seriesId)
 * - attempts: qualifying student attempts (status: "SUBMITTED", role NOT IN ["TEACHER", "ADMIN"])
 * - uniqueStudents: distinct student userIds who have submitted attempts
 * - avgScore: average score of first submitted attempts across tests in this package
 * Zero revenue amounts returned.
 */
export async function computePackageMetrics(seriesId: string): Promise<PackageMetrics> {
  const tests = await prisma.examTest.findMany({
    where: { seriesId },
    select: { id: true, isPublished: true },
  })
  const testsTotal = tests.length
  const testsPublished = tests.filter((t) => t.isPublished).length
  const testIds = tests.map((t) => t.id)

  const enrollments = await prisma.examSeriesEnrollment.findMany({
    where: { seriesId, status: "ACTIVE" },
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
        select: {
          id: true,
          razorpayOrderId: true,
          externalId: true,
          status: true,
        },
      })

      for (const enrollment of purchasedEnrollments) {
        if (!enrollment.orderId) continue
        const isPaid = completedPayments.some(
          (p) =>
            p.razorpayOrderId === enrollment.orderId ||
            p.externalId === enrollment.orderId ||
            p.id === enrollment.orderId
        )

        if (isPaid) {
          paid += 1
        }
      }
    }
  }

  let attempts = 0
  let uniqueStudents = 0
  let avgScore = 0

  if (testIds.length > 0) {
    const studentAttempts = await prisma.examAttempt.findMany({
      where: {
        testId: { in: testIds },
        status: "SUBMITTED",
        user: {
          role: {
            notIn: ["TEACHER", "ADMIN"],
          },
        },
      },
      select: {
        id: true,
        userId: true,
        testId: true,
        score: true,
        submittedAt: true,
        startedAt: true,
      },
      orderBy: [{ submittedAt: "asc" }, { startedAt: "asc" }],
    })

    attempts = studentAttempts.length
    const uniqueUserSet = new Set(studentAttempts.map((a) => a.userId))
    uniqueStudents = uniqueUserSet.size

    // First submitted attempt per user per test for average score
    const firstAttempts = new Map<string, number>()
    for (const att of studentAttempts) {
      const key = `${att.userId}:${att.testId}`
      if (!firstAttempts.has(key)) {
        firstAttempts.set(key, att.score)
      }
    }
    const scores = Array.from(firstAttempts.values())
    if (scores.length > 0) {
      avgScore = Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
    }
  }

  return {
    testsTotal,
    testsPublished,
    enrolled,
    paid,
    pass,
    free,
    attempts,
    uniqueStudents,
    avgScore,
  }
}

/**
 * Lists packages accessible to current user:
 * - ADMIN: all packages
 * - TEACHER: packages created by current user only
 */
export async function listExamPackages({
  userId,
  role,
}: {
  userId: string
  role: string
}): Promise<PackageSummary[]> {
  const where = role === "ADMIN" ? {} : { createdById: userId }

  const seriesList = await prisma.examSeries.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      examName: true,
      isPublished: true,
      createdById: true,
      createdAt: true,
    },
  })

  const packages: PackageSummary[] = []
  for (const series of seriesList) {
    const metrics = await computePackageMetrics(series.id)
    packages.push({
      id: series.id,
      slug: series.slug,
      title: series.title,
      description: series.description,
      category: series.category,
      examName: series.examName,
      isPublished: series.isPublished,
      createdById: series.createdById,
      createdAt: series.createdAt.toISOString(),
      metrics,
    })
  }

  return packages
}

/**
 * Retrieves details for a specific package with ownership protection:
 * - 404 if package not found
 * - 403 if TEACHER attempts to view another teacher's package
 */
export async function getExamPackageDetail({
  packageIdOrSlug,
  userId,
  role,
}: {
  packageIdOrSlug: string
  userId: string
  role: string
}): Promise<{ status: 200 | 403 | 404; data?: PackageDetail; error?: string }> {
  const series = await prisma.examSeries.findFirst({
    where: {
      OR: [{ id: packageIdOrSlug }, { slug: packageIdOrSlug }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      examName: true,
      isPublished: true,
      createdById: true,
      createdAt: true,
    },
  })

  if (!series) {
    return { status: 404, error: "Package not found" }
  }

  if (role !== "ADMIN" && series.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not have access to this package" }
  }

  const metrics = await computePackageMetrics(series.id)

  const dbTests = await prisma.examTest.findMany({
    where: { seriesId: series.id },
    select: {
      id: true,
      title: true,
      totalQuestions: true,
      durationMinutes: true,
      totalMarks: true,
      isPublished: true,
      _count: {
        select: {
          attempts: {
            where: {
              status: "SUBMITTED",
              user: { role: { notIn: ["TEACHER", "ADMIN"] } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const tests: PackageTestItem[] = []
  for (const t of dbTests) {
    const { rankedAttempts } = await getTestRankings(t.id)
    const topRanks = rankedAttempts.slice(0, 5).map((r) => ({
      rank: r.rank,
      name: r.name,
      avatar: r.avatar,
      score: r.score,
      accuracy: r.accuracy,
      timeTakenSecs: r.timeTakenSecs,
    }))

    const avgScore =
      rankedAttempts.length > 0
        ? Math.round((rankedAttempts.reduce((sum, a) => sum + a.score, 0) / rankedAttempts.length) * 10) / 10
        : 0

    tests.push({
      id: t.id,
      title: t.title,
      totalQuestions: t.totalQuestions,
      durationMinutes: t.durationMinutes,
      totalMarks: t.totalMarks,
      isPublished: t.isPublished,
      attemptsCount: t._count.attempts,
      avgScore,
      topRanks,
    })
  }

  return {
    status: 200,
    data: {
      id: series.id,
      slug: series.slug,
      title: series.title,
      description: series.description,
      category: series.category,
      examName: series.examName,
      isPublished: series.isPublished,
      createdById: series.createdById,
      createdAt: series.createdAt.toISOString(),
      metrics,
      tests,
    },
  }
}
