import { prisma } from "./prisma"
import { getTestRankings } from "./exam-ranking"
import { revalidatePath, revalidateTag } from "next/cache"
import { SYSTEM_SERIES_SLUGS, isSystemSeriesSlug } from "./exam/ensure-system-series"
import { writeDualAuditLog } from "./exam/audit-helper"
import { computeAuthoritativePackageMetrics } from "./exam/metrics"

function safeRevalidateTag(tag: string) {
  try {
    revalidateTag(tag)
  } catch {
    // Graceful fallback outside Next.js request lifecycle
  }
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Graceful fallback outside Next.js request lifecycle
  }
}

export interface PackageMetrics {
  testsTotal: number
  testsPublished: number
  testsDraft?: number
  testsScheduled?: number
  testsArchived?: number
  enrolled: number
  paid: number
  pass: number
  free: number
  attempts: number
  enrolledAttempts?: number
  guestAttempts?: number
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
  isArchived: boolean
  archivedAt?: string | null
  isFree?: boolean
  isPro?: boolean
  totalTests?: number
  thumbnailUrl?: string | null
  logoType?: string | null
  languages?: string
  highlights?: string[]
  isGated?: boolean
  previewPercentage?: number
  seoMode?: string
  gateTitle?: string | null
  gateSubtitle?: string | null
  bannerUrl?: string | null
  syllabus?: string | null
  keyFeatures?: string[]
  whyThisSeries?: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
  metrics: PackageMetrics
}

export interface PackageTestItem {
  id: string
  title: string
  titleHi?: string | null
  totalQuestions: number
  durationMinutes: number
  totalMarks: number
  isPublished: boolean
  isArchived: boolean
  archivedAt?: string | null
  order?: number
  gateMode?: string
  previewPercentage?: number | null
  attemptsCount: number
  avgScore: number
  topRanks: {
    rank: number
    userId?: string
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
 */
export async function computePackageMetrics(seriesId: string): Promise<PackageMetrics> {
  return computeAuthoritativePackageMetrics(seriesId)
}

/**
 * Lists packages accessible to current user:
 * - ADMIN: all packages
 * - TEACHER: packages created by current user only
 * - Excludes hidden system series
 */
export async function listExamPackages({
  userId,
  role,
  archivedFilter = "ACTIVE",
}: {
  userId: string
  role: string
  archivedFilter?: "ACTIVE" | "ARCHIVED" | "ALL"
}): Promise<PackageSummary[]> {
  const where: any = {
    slug: {
      notIn: Array.from(SYSTEM_SERIES_SLUGS),
    },
  }

  if (role !== "ADMIN") {
    where.createdById = userId
  }

  if (archivedFilter === "ACTIVE") {
    where.isArchived = false
  } else if (archivedFilter === "ARCHIVED") {
    where.isArchived = true
  }

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
      isArchived: true,
      archivedAt: true,
      isFree: true,
      isPro: true,
      thumbnailUrl: true,
      logoType: true,
      languages: true,
      highlights: true,
      isGated: true,
      previewPercentage: true,
      seoMode: true,
      gateTitle: true,
      gateSubtitle: true,
      bannerUrl: true,
      syllabus: true,
      keyFeatures: true,
      whyThisSeries: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
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
      isArchived: series.isArchived,
      archivedAt: series.archivedAt?.toISOString() || null,
      isFree: series.isFree,
      isPro: series.isPro,
      totalTests: metrics.testsTotal,
      thumbnailUrl: series.thumbnailUrl,
      logoType: series.logoType,
      languages: series.languages,
      highlights: series.highlights,
      isGated: series.isGated,
      previewPercentage: series.previewPercentage,
      seoMode: series.seoMode,
      gateTitle: series.gateTitle,
      gateSubtitle: series.gateSubtitle,
      bannerUrl: series.bannerUrl,
      syllabus: series.syllabus,
      keyFeatures: series.keyFeatures,
      whyThisSeries: series.whyThisSeries,
      createdById: series.createdById,
      createdAt: series.createdAt.toISOString(),
      updatedAt: series.updatedAt.toISOString(),
      metrics,
    })
  }

  return packages
}

/**
 * Retrieves details for a specific package with ownership protection:
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
  let series = await prisma.examSeries.findFirst({
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
      isArchived: true,
      archivedAt: true,
      isFree: true,
      isPro: true,
      thumbnailUrl: true,
      logoType: true,
      languages: true,
      highlights: true,
      isGated: true,
      previewPercentage: true,
      seoMode: true,
      gateTitle: true,
      gateSubtitle: true,
      bannerUrl: true,
      syllabus: true,
      keyFeatures: true,
      whyThisSeries: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Slug redirect lookup if not found directly by current id or slug
  if (!series) {
    let resolvedSlug: string | null = null
    try {
      const history = await (prisma as any).packageSlugHistory?.findUnique({
        where: { oldSlug: packageIdOrSlug },
        select: { newSlug: true },
      })
      if (history?.newSlug) {
        resolvedSlug = history.newSlug
      }
    } catch {
      // fallback
    }

    if (!resolvedSlug) {
      try {
        const audit = await prisma.auditLog.findFirst({
          where: {
            action: "EXAM_SERIES_PACKAGE_UPDATE",
            metadata: {
              path: ["before", "slug"],
              equals: packageIdOrSlug,
            },
          },
          orderBy: { createdAt: "desc" },
          select: { metadata: true },
        })
        resolvedSlug = (audit?.metadata as any)?.after?.slug || null
      } catch {
        // fallback
      }
    }

    if (resolvedSlug) {
      series = await prisma.examSeries.findFirst({
        where: { slug: resolvedSlug },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          examName: true,
          isPublished: true,
          isArchived: true,
          archivedAt: true,
          isFree: true,
          isPro: true,
          thumbnailUrl: true,
          logoType: true,
          languages: true,
          highlights: true,
          isGated: true,
          previewPercentage: true,
          seoMode: true,
          gateTitle: true,
          gateSubtitle: true,
          bannerUrl: true,
          syllabus: true,
          keyFeatures: true,
          whyThisSeries: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    }
  }

  if (!series) {
    return { status: 404, error: "Package not found" }
  }

  if (role !== "ADMIN" && series.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not have access to this package" }
  }

  const matchingSeriesIds = Array.from(new Set([series.id, series.slug].filter(Boolean)))
  const metrics = await computePackageMetrics(series.id)

  const dbTests = await prisma.examTest.findMany({
    where: { seriesId: { in: matchingSeriesIds } },
    select: {
      id: true,
      title: true,
      titleHi: true,
      totalQuestions: true,
      durationMinutes: true,
      totalMarks: true,
      isPublished: true,
      isArchived: true,
      archivedAt: true,
      order: true,
      gateMode: true,
      previewPercentage: true,
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
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  })

  const tests: PackageTestItem[] = []
  for (const t of dbTests) {
    const { rankedAttempts } = await getTestRankings(t.id)
    const topRanks = rankedAttempts.slice(0, 5).map((r) => ({
      rank: r.rank,
      userId: r.userId,
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
      titleHi: t.titleHi,
      totalQuestions: t.totalQuestions,
      durationMinutes: t.durationMinutes,
      totalMarks: t.totalMarks,
      isPublished: t.isPublished,
      isArchived: t.isArchived,
      archivedAt: t.archivedAt?.toISOString() || null,
      order: t.order,
      gateMode: t.gateMode,
      previewPercentage: t.previewPercentage,
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
      isArchived: series.isArchived,
      archivedAt: series.archivedAt?.toISOString() || null,
      isFree: series.isFree,
      isPro: series.isPro,
      totalTests: metrics.testsTotal,
      thumbnailUrl: series.thumbnailUrl,
      logoType: series.logoType,
      languages: series.languages,
      highlights: series.highlights,
      isGated: series.isGated,
      previewPercentage: series.previewPercentage,
      seoMode: series.seoMode,
      gateTitle: series.gateTitle,
      gateSubtitle: series.gateSubtitle,
      bannerUrl: series.bannerUrl,
      syllabus: series.syllabus,
      keyFeatures: series.keyFeatures,
      whyThisSeries: series.whyThisSeries,
      createdById: series.createdById,
      createdAt: series.createdAt.toISOString(),
      updatedAt: series.updatedAt.toISOString(),
      metrics,
      tests,
    },
  }
}

/**
 * Updates full package details (title, slug, category, tier, gating, etc.)
 */
export async function updateExamPackageDetails({
  packageIdOrSlug,
  userId,
  role,
  data,
  expectedUpdatedAt,
}: {
  packageIdOrSlug: string
  userId: string
  role: string
  data: {
    title?: string
    slug?: string
    examName?: string
    category?: string
    description?: string | null
    thumbnailUrl?: string | null
    logoType?: string | null
    languages?: string
    highlights?: string[]
    isFree?: boolean
    isPro?: boolean
    isPublished?: boolean
    isGated?: boolean
    previewPercentage?: number
    seoMode?: string
    gateTitle?: string | null
    gateSubtitle?: string | null
    bannerUrl?: string | null
    syllabus?: string | null
    keyFeatures?: string[]
    whyThisSeries?: string | null
  }
  expectedUpdatedAt?: string
}): Promise<{ status: 200 | 400 | 403 | 404 | 409; data?: any; error?: string }> {
  const series = await prisma.examSeries.findFirst({
    where: {
      OR: [{ id: packageIdOrSlug }, { slug: packageIdOrSlug }],
    },
  })

  if (!series) {
    return { status: 404, error: "Package not found" }
  }

  if (role !== "ADMIN" && series.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not have permission to edit this package" }
  }

  // Concurrency check
  if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(series.updatedAt).getTime()) {
    return {
      status: 409,
      error: "Conflict: This package has been modified by another action. Please refresh and retry.",
    }
  }

  const updates: Record<string, any> = {}

  if (data.title !== undefined) {
    const cleanTitle = String(data.title).trim()
    if (!cleanTitle) {
      return { status: 400, error: "Package title cannot be empty" }
    }
    updates.title = cleanTitle
  }

  if (data.category !== undefined) {
    const cleanCat = String(data.category).trim()
    if (!cleanCat) {
      return { status: 400, error: "Category cannot be empty" }
    }
    updates.category = cleanCat
  }

  if (data.slug !== undefined) {
    const cleanSlug = String(data.slug)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")

    if (!cleanSlug) {
      return { status: 400, error: "Valid slug is required" }
    }

    if (cleanSlug !== series.slug) {
      const existing = await prisma.examSeries.findUnique({
        where: { slug: cleanSlug },
        select: { id: true },
      })
      if (existing && existing.id !== series.id) {
        return { status: 400, error: `Slug "${cleanSlug}" is already taken by another package.` }
      }
      updates.slug = cleanSlug
    }
  }

  if (data.examName !== undefined) updates.examName = String(data.examName).trim() || updates.category || series.category
  if (data.description !== undefined) updates.description = data.description ? String(data.description).trim() : null
  if (data.thumbnailUrl !== undefined) updates.thumbnailUrl = data.thumbnailUrl ? String(data.thumbnailUrl).trim() : null
  if (data.logoType !== undefined) updates.logoType = data.logoType || "general"
  if (data.languages !== undefined) updates.languages = data.languages || "English, Hindi"
  if (Array.isArray(data.highlights)) {
    updates.highlights = data.highlights.map((h) => String(h).trim()).filter(Boolean)
  }

  if (data.isFree !== undefined) updates.isFree = Boolean(data.isFree)
  if (data.isPro !== undefined) updates.isPro = Boolean(data.isPro)
  if (data.isPublished !== undefined) updates.isPublished = Boolean(data.isPublished)

  // Authwall gating
  if (data.isGated !== undefined) updates.isGated = Boolean(data.isGated)
  if (data.previewPercentage !== undefined) {
    updates.previewPercentage = Math.max(0, Math.min(100, Math.round(Number(data.previewPercentage) || 20)))
  }
  if (data.seoMode !== undefined) {
    updates.seoMode = String(data.seoMode).toLowerCase() === "bot-full" ? "bot-full" : "preview"
  }
  if (data.gateTitle !== undefined) updates.gateTitle = data.gateTitle ? String(data.gateTitle).trim() : null
  if (data.gateSubtitle !== undefined) updates.gateSubtitle = data.gateSubtitle ? String(data.gateSubtitle).trim() : null

  if (data.bannerUrl !== undefined) updates.bannerUrl = data.bannerUrl ? String(data.bannerUrl).trim() : null
  if (data.syllabus !== undefined) updates.syllabus = data.syllabus ? String(data.syllabus).trim() : null
  if (Array.isArray(data.keyFeatures)) {
    updates.keyFeatures = data.keyFeatures.map((f) => String(f).trim()).filter(Boolean)
  }
  if (data.whyThisSeries !== undefined) updates.whyThisSeries = data.whyThisSeries ? String(data.whyThisSeries).trim() : null

  const updated = await prisma.examSeries.update({
    where: { id: series.id },
    data: updates,
  })

  // Revalidate caches
  const oldSlug = series.slug
  const newSlug = updated.slug

  safeRevalidateTag("exam-series")
  safeRevalidatePath("/test-series")
  safeRevalidatePath(`/admin/test-series/packages`)
  safeRevalidatePath(`/teacher/test-series/packages`)
  safeRevalidatePath(`/admin/test-series/package/${oldSlug}`)
  safeRevalidatePath(`/teacher/test-series/package/${oldSlug}`)
  safeRevalidatePath(`/test-series/${oldSlug}`)

  if (newSlug !== oldSlug) {
    try {
      await (prisma as any).packageSlugHistory?.upsert({
        where: { oldSlug: oldSlug },
        create: {
          seriesId: updated.id,
          oldSlug: oldSlug,
          newSlug: newSlug,
        },
        update: {
          newSlug: newSlug,
        },
      })
    } catch (err) {
      console.warn("[PACKAGE_SLUG_HISTORY_RECORD_ERROR]", err)
    }

    safeRevalidatePath(`/admin/test-series/package/${newSlug}`)
    safeRevalidatePath(`/teacher/test-series/package/${newSlug}`)
    safeRevalidatePath(`/test-series/${newSlug}`)
  }

  await writeDualAuditLog({
    actorId: userId,
    action: "UPDATE",
    targetId: updated.id,
    entityType: "EXAM_SERIES",
    details: {
      before: {
        title: series.title,
        slug: series.slug,
        isPublished: series.isPublished,
      },
      after: {
        title: updated.title,
        slug: updated.slug,
        isPublished: updated.isPublished,
      },
    },
  })

  return { status: 200, data: updated }
}

/**
 * Updates Gate Mode settings for Series and/or child tests
 */
export async function updateExamPackageGate({
  packageIdOrSlug,
  userId,
  role,
  data,
}: {
  packageIdOrSlug: string
  userId: string
  role: string
  data: {
    isGated?: boolean
    previewPercentage?: number
    seoMode?: "preview" | "bot-full" | string
    gateTitle?: string | null
    gateSubtitle?: string | null
    tests?: { id: string; gateMode: string; previewPercentage?: number | null }[]
  }
}): Promise<{ status: 200 | 400 | 403 | 404; data?: any; error?: string }> {
  const series = await prisma.examSeries.findFirst({
    where: {
      OR: [{ id: packageIdOrSlug }, { slug: packageIdOrSlug }],
    },
    select: { id: true, slug: true, createdById: true },
  })

  if (!series) {
    return { status: 404, error: "Package not found" }
  }

  if (role !== "ADMIN" && series.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not have permission to edit this package" }
  }

  const seriesUpdate: Record<string, any> = {}
  if (data.isGated !== undefined) seriesUpdate.isGated = Boolean(data.isGated)
  if (data.previewPercentage !== undefined) {
    seriesUpdate.previewPercentage = Math.max(0, Math.min(100, Math.round(Number(data.previewPercentage) || 20)))
  }
  if (data.seoMode !== undefined) {
    seriesUpdate.seoMode = String(data.seoMode).toLowerCase() === "bot-full" ? "bot-full" : "preview"
  }
  if (data.gateTitle !== undefined) seriesUpdate.gateTitle = data.gateTitle || null
  if (data.gateSubtitle !== undefined) seriesUpdate.gateSubtitle = data.gateSubtitle || null

  const updatedSeries = await prisma.$transaction(async (tx) => {
    let s = series
    if (Object.keys(seriesUpdate).length > 0) {
      s = await tx.examSeries.update({
        where: { id: series.id },
        data: seriesUpdate,
        select: { id: true, slug: true, createdById: true },
      })
    }

    if (Array.isArray(data.tests)) {
      for (const t of data.tests) {
        if (!t.id) continue
        const testMode = ["inherit", "free", "preview", "locked"].includes(String(t.gateMode).toLowerCase())
          ? String(t.gateMode).toLowerCase()
          : "inherit"
        const testPct =
          t.previewPercentage === null || t.previewPercentage === undefined
            ? null
            : Math.max(0, Math.min(100, Math.round(Number(t.previewPercentage))))

        await tx.examTest.updateMany({
          where: { id: t.id, seriesId: series.id },
          data: {
            gateMode: testMode,
            previewPercentage: testPct,
          },
        })
      }
    }

    return s
  })

  return { status: 200, data: updatedSeries }
}

/**
 * Deletes or archives a package safely based on learner dependencies.
 * If purchases, active enrollments, or attempts exist: soft-archives.
 * If zero dependencies: performs cascade hard-delete.
 */
export async function deleteExamPackage({
  packageIdOrSlug,
  userId,
  role,
}: {
  packageIdOrSlug: string
  userId: string
  role: string
}): Promise<{
  status: 200 | 403 | 404 | 500
  action: "ARCHIVED" | "DELETED"
  message: string
  error?: string
}> {
  const series = await prisma.examSeries.findFirst({
    where: {
      OR: [{ id: packageIdOrSlug }, { slug: packageIdOrSlug }],
    },
    include: {
      tests: {
        select: { id: true },
      },
      enrollments: {
        select: { id: true, enrollType: true, orderId: true },
      },
    },
  })

  if (!series) {
    return { status: 404, action: "DELETED", message: "", error: "Package not found" }
  }

  if (role !== "ADMIN" && series.createdById !== userId) {
    return {
      status: 403,
      action: "DELETED",
      message: "",
      error: "Forbidden: You do not have permission to delete this package",
    }
  }

  const testIds = series.tests.map((t) => t.id)

  // 1. Check student attempts
  const attemptsCount =
    testIds.length > 0
      ? await prisma.examAttempt.count({
          where: { testId: { in: testIds } },
        })
      : 0

  // 2. Check active enrollments
  const enrollmentsCount = series.enrollments.length

  // 3. Check verified completed purchases
  const orderIds = series.enrollments
    .map((e) => e.orderId)
    .filter((id): id is string => Boolean(id))

  const paidCount =
    orderIds.length > 0
      ? await prisma.payment.count({
          where: {
            status: "COMPLETED",
            OR: [
              { razorpayOrderId: { in: orderIds } },
              { externalId: { in: orderIds } },
              { id: { in: orderIds } },
            ],
          },
        })
      : 0

  const hasDependencies = attemptsCount > 0 || enrollmentsCount > 0 || paidCount > 0

  if (hasDependencies) {
    // Soft delete / Archive
    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.examSeries.update({
        where: { id: series.id },
        data: {
          isArchived: true,
          archivedAt: now,
          isPublished: false,
        },
      })

      if (testIds.length > 0) {
        await tx.examTest.updateMany({
          where: { id: { in: testIds } },
          data: {
            isArchived: true,
            archivedAt: now,
            isPublished: false,
          },
        })
      }
    })

    safeRevalidateTag("exam-series")
    safeRevalidatePath("/test-series")
    safeRevalidatePath(`/admin/test-series/packages`)
    safeRevalidatePath(`/teacher/test-series/packages`)

    await writeDualAuditLog({
      actorId: userId,
      action: "ARCHIVE" as any,
      targetId: series.id,
      entityType: "EXAM_SERIES",
      details: {
        reason: "Learner dependencies exist; package archived to preserve history",
        attemptsCount,
        enrollmentsCount,
        paidCount,
      },
    })

    return {
      status: 200,
      action: "ARCHIVED",
      message: `Package "${series.title}" archived successfully (${attemptsCount} attempts, ${enrollmentsCount} enrollments preserved).`,
    }
  }

  // Zero dependencies -> Transactional cascade hard-delete
  await prisma.$transaction(async (tx) => {
    // Unlink any PYQ references
    if (testIds.length > 0) {
      await tx.pyqPaper.updateMany({
        where: { cbtTestId: { in: testIds } },
        data: { hasCbtMode: false, cbtTestId: null },
      })

      // Delete sections and questions
      const sections = await tx.examSection.findMany({
        where: { testId: { in: testIds } },
        select: { id: true },
      })
      const sectionIds = sections.map((s) => s.id)
      if (sectionIds.length > 0) {
        await tx.examQuestion.deleteMany({ where: { sectionId: { in: sectionIds } } })
      }
      await tx.examSection.deleteMany({ where: { testId: { in: testIds } } })
      await tx.examTest.deleteMany({ where: { id: { in: testIds } } })
    }

    await tx.examSeriesEnrollment.deleteMany({ where: { seriesId: series.id } })
    await tx.examSeries.delete({ where: { id: series.id } })
  })

  safeRevalidateTag("exam-series")
  safeRevalidatePath("/test-series")
  safeRevalidatePath(`/admin/test-series/packages`)
  safeRevalidatePath(`/teacher/test-series/packages`)

  await writeDualAuditLog({
    actorId: userId,
    action: "DELETE",
    targetId: series.id,
    entityType: "EXAM_SERIES",
    details: {
      deletedTitle: series.title,
      cleanHardDelete: true,
    },
  })

  return {
    status: 200,
    action: "DELETED",
    message: `Package "${series.title}" permanently deleted.`,
  }
}

/**
 * Restores an archived package.
 */
export async function restoreExamPackage({
  packageIdOrSlug,
  userId,
  role,
}: {
  packageIdOrSlug: string
  userId: string
  role: string
}): Promise<{ status: 200 | 403 | 404; data?: any; error?: string }> {
  const series = await prisma.examSeries.findFirst({
    where: {
      OR: [{ id: packageIdOrSlug }, { slug: packageIdOrSlug }],
    },
  })

  if (!series) {
    return { status: 404, error: "Package not found" }
  }

  if (role !== "ADMIN" && series.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not have permission to restore this package" }
  }

  const restored = await prisma.$transaction(async (tx) => {
    const s = await tx.examSeries.update({
      where: { id: series.id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    })

    await tx.examTest.updateMany({
      where: { seriesId: series.id, isArchived: true },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    })

    return s
  })

  safeRevalidateTag("exam-series")
  safeRevalidatePath("/test-series")
  safeRevalidatePath(`/admin/test-series/package/${restored.slug}`)

  await writeDualAuditLog({
    actorId: userId,
    action: "RESTORE_VERSION",
    targetId: series.id,
    entityType: "EXAM_SERIES",
    details: { restored: true },
  })

  return { status: 200, data: restored }
}

/**
 * Duplicates a package and its test items. Never copies attempts, enrollments, or payments.
 */
export async function duplicateExamPackage({
  packageIdOrSlug,
  userId,
  role,
}: {
  packageIdOrSlug: string
  userId: string
  role: string
}): Promise<{ status: 200 | 403 | 404; data?: any; error?: string }> {
  const original = await prisma.examSeries.findFirst({
    where: {
      OR: [{ id: packageIdOrSlug }, { slug: packageIdOrSlug }],
    },
    include: {
      tests: {
        include: {
          sections: {
            include: {
              questions: true,
            },
          },
        },
      },
    },
  })

  if (!original) {
    return { status: 404, error: "Package not found" }
  }

  if (role !== "ADMIN" && original.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not own this package" }
  }

  const shortNonce = Math.random().toString(36).substring(2, 6)
  const newSlug = `${original.slug}-copy-${shortNonce}`
  const newTitle = `${original.title} (Copy)`

  const cloned = await prisma.$transaction(async (tx) => {
    const newPkg = await tx.examSeries.create({
      data: {
        title: newTitle,
        slug: newSlug,
        examName: original.examName,
        category: original.category,
        description: original.description,
        thumbnailUrl: original.thumbnailUrl,
        logoType: original.logoType,
        highlights: original.highlights,
        isFree: original.isFree,
        isPro: original.isPro,
        isPublished: false, // Copies start in Draft
        languages: original.languages,
        isGated: original.isGated,
        previewPercentage: original.previewPercentage,
        seoMode: original.seoMode,
        gateTitle: original.gateTitle,
        gateSubtitle: original.gateSubtitle,
        createdById: userId,
      },
    })

    // Clone tests
    for (const test of original.tests) {
      const clonedTest = await tx.examTest.create({
        data: {
          seriesId: newPkg.id,
          title: `${test.title} (Copy)`,
          titleHi: test.titleHi,
          testType: test.testType,
          accessMode: test.accessMode,
          durationMinutes: test.durationMinutes,
          totalQuestions: test.totalQuestions,
          totalMarks: test.totalMarks,
          positiveMarks: test.positiveMarks,
          negativeMarks: test.negativeMarks,
          instructions: test.instructions,
          isPublished: false,
          gateMode: test.gateMode,
          previewPercentage: test.previewPercentage,
          createdById: userId,
        },
      })

      for (const sec of test.sections) {
        const clonedSec = await tx.examSection.create({
          data: {
            testId: clonedTest.id,
            title: sec.title,
            titleHi: sec.titleHi,
            order: sec.order,
            positiveMarks: sec.positiveMarks,
            negativeMarks: sec.negativeMarks,
            timeLimitMins: sec.timeLimitMins,
          },
        })

        if (sec.questions.length > 0) {
          await tx.examQuestion.createMany({
            data: sec.questions.map((q) => ({
              sectionId: clonedSec.id,
              questionType: q.questionType,
              questionEn: q.questionEn,
              questionHi: q.questionHi,
              optionAEn: q.optionAEn,
              optionBEn: q.optionBEn,
              optionCEn: q.optionCEn,
              optionDEn: q.optionDEn,
              optionAHi: q.optionAHi,
              optionBHi: q.optionBHi,
              optionCHi: q.optionCHi,
              optionDHi: q.optionDHi,
              correctOption: q.correctOption,
              explanationEn: q.explanationEn,
              explanationHi: q.explanationHi,
              videoUrl: q.videoUrl,
              difficulty: q.difficulty,
              subject: q.subject,
              topic: q.topic,
              subTopic: q.subTopic,
              order: q.order,
              positiveMarks: q.positiveMarks,
              negativeMarks: q.negativeMarks,
            })),
          })
        }
      }
    }

    return newPkg
  })

  safeRevalidateTag("exam-series")

  await writeDualAuditLog({
    actorId: userId,
    action: "DUPLICATE",
    targetId: cloned.id,
    entityType: "EXAM_SERIES",
    details: {
      originalId: original.id,
      originalSlug: original.slug,
      newSlug: cloned.slug,
    },
  })

  return { status: 200, data: cloned }
}
