import { prisma } from "./prisma"
import { revalidatePath, revalidateTag } from "next/cache"
import { ensureUnassignedSystemSeries } from "./exam/ensure-system-series"
import { writeDualAuditLog } from "./exam/audit-helper"

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

/**
 * Duplicates an individual test along with its sections and questions.
 * Does not duplicate attempts or submissions.
 */
export async function duplicateExamTest({
  testId,
  userId,
  role,
}: {
  testId: string
  userId: string
  role: string
}): Promise<{ status: 200 | 403 | 404; data?: any; error?: string }> {
  const original = await prisma.examTest.findUnique({
    where: { id: testId },
    include: {
      sections: {
        include: {
          questions: true,
        },
      },
      series: {
        select: { id: true, slug: true },
      },
    },
  })

  if (!original) {
    return { status: 404, error: "Test not found" }
  }

  if (role !== "ADMIN" && original.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not have permission to duplicate this test" }
  }

  const cloned = await prisma.$transaction(async (tx) => {
    const newTest = await tx.examTest.create({
      data: {
        seriesId: original.seriesId,
        title: `${original.title} (Copy)`,
        titleHi: original.titleHi ? `${original.titleHi} (प्रतिलिपि)` : null,
        testType: original.testType,
        accessMode: original.accessMode,
        durationMinutes: original.durationMinutes,
        totalQuestions: original.totalQuestions,
        totalMarks: original.totalMarks,
        positiveMarks: original.positiveMarks,
        negativeMarks: original.negativeMarks,
        instructions: original.instructions,
        isPublished: false, // Cloned test starts in draft
        isArchived: false,
        gateMode: original.gateMode,
        previewPercentage: original.previewPercentage,
        createdById: userId,
      },
    })

    for (const sec of original.sections) {
      const clonedSec = await tx.examSection.create({
        data: {
          testId: newTest.id,
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

    return newTest
  })

  safeRevalidateTag("exam-series")
  if (original.series?.slug) {
    safeRevalidatePath(`/admin/test-series/package/${original.series.slug}`)
    safeRevalidatePath(`/teacher/test-series/package/${original.series.slug}`)
  }

  await writeDualAuditLog({
    actorId: userId,
    action: "DUPLICATE",
    targetId: cloned.id,
    entityType: "EXAM_TEST",
    details: {
      originalTestId: original.id,
      seriesId: original.seriesId,
      clonedTitle: cloned.title,
    },
  })

  return { status: 200, data: cloned }
}

/**
 * Detaches a test from its current package by moving it to the hidden unassigned system series.
 */
export async function detachExamTest({
  testId,
  packageIdOrSlug,
  userId,
  role,
}: {
  testId: string
  packageIdOrSlug?: string
  userId: string
  role: string
}): Promise<{ status: 200 | 400 | 403 | 404; data?: any; error?: string }> {
  const test = await prisma.examTest.findUnique({
    where: { id: testId },
    include: {
      series: { select: { id: true, slug: true, createdById: true } },
    },
  })

  if (!test) {
    return { status: 404, error: "Test not found" }
  }

  // IDOR protection: if packageIdOrSlug provided, ensure test belongs to that package
  if (
    packageIdOrSlug &&
    test.series.id !== packageIdOrSlug &&
    test.series.slug !== packageIdOrSlug
  ) {
    return {
      status: 400,
      error: "IDOR Conflict: Test does not belong to the package specified in the request",
    }
  }

  if (role !== "ADMIN" && test.createdById !== userId && test.series.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not own this test" }
  }

  const unassignedSeries = await ensureUnassignedSystemSeries()

  const updated = await prisma.$transaction(async (tx) => {
    // If was published in previous package, decrement totalTests
    if (test.isPublished && test.seriesId) {
      await tx.examSeries.update({
        where: { id: test.seriesId },
        data: { totalTests: { decrement: 1 } },
      })
    }

    return tx.examTest.update({
      where: { id: testId },
      data: {
        seriesId: unassignedSeries.id,
      },
    })
  })

  safeRevalidateTag("exam-series")
  if (test.series.slug) {
    safeRevalidatePath(`/admin/test-series/package/${test.series.slug}`)
    safeRevalidatePath(`/teacher/test-series/package/${test.series.slug}`)
  }
  safeRevalidatePath(`/admin/test-series`)
  safeRevalidatePath(`/teacher/test-series`)

  await writeDualAuditLog({
    actorId: userId,
    action: "UPDATE",
    targetId: test.id,
    entityType: "EXAM_TEST",
    details: {
      actionType: "DETACH_FROM_PACKAGE",
      fromSeriesId: test.seriesId,
      toSeriesId: unassignedSeries.id,
    },
  })

  return { status: 200, data: updated }
}

/**
 * Assigns an unassigned or existing test to a target package.
 */
export async function assignTestToPackage({
  testId,
  targetPackageIdOrSlug,
  userId,
  role,
}: {
  testId: string
  targetPackageIdOrSlug: string
  userId: string
  role: string
}): Promise<{ status: 200 | 400 | 403 | 404; data?: any; error?: string }> {
  const [test, targetSeries] = await Promise.all([
    prisma.examTest.findUnique({
      where: { id: testId },
      include: { series: true },
    }),
    prisma.examSeries.findFirst({
      where: {
        OR: [{ id: targetPackageIdOrSlug }, { slug: targetPackageIdOrSlug }],
      },
    }),
  ])

  if (!test) return { status: 404, error: "Test not found" }
  if (!targetSeries) return { status: 404, error: "Target package not found" }

  if (role !== "ADMIN" && test.createdById !== userId && targetSeries.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not own this test or target package" }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // If was published in previous series, decrement previous series totalTests
    if (test.isPublished && test.seriesId && test.seriesId !== targetSeries.id) {
      await tx.examSeries.update({
        where: { id: test.seriesId },
        data: { totalTests: { decrement: 1 } },
      })
    }

    // Increment target series totalTests if published
    if (test.isPublished && test.seriesId !== targetSeries.id) {
      await tx.examSeries.update({
        where: { id: targetSeries.id },
        data: { totalTests: { increment: 1 } },
      })
    }

    return tx.examTest.update({
      where: { id: testId },
      data: {
        seriesId: targetSeries.id,
      },
    })
  })

  safeRevalidateTag("exam-series")
  safeRevalidatePath(`/admin/test-series/package/${targetSeries.slug}`)
  safeRevalidatePath(`/teacher/test-series/package/${targetSeries.slug}`)
  safeRevalidatePath(`/admin/test-series`)
  safeRevalidatePath(`/teacher/test-series`)

  await writeDualAuditLog({
    actorId: userId,
    action: "UPDATE",
    targetId: test.id,
    entityType: "EXAM_TEST",
    details: {
      actionType: "ASSIGN_TO_PACKAGE",
      fromSeriesId: test.seriesId,
      toSeriesId: targetSeries.id,
    },
  })

  return { status: 200, data: updated }
}

/**
 * Toggles archive state of a test.
 */
export async function toggleArchiveExamTest({
  testId,
  isArchived,
  userId,
  role,
}: {
  testId: string
  isArchived: boolean
  userId: string
  role: string
}): Promise<{ status: 200 | 403 | 404; data?: any; error?: string }> {
  const test = await prisma.examTest.findUnique({
    where: { id: testId },
    include: { series: true },
  })

  if (!test) return { status: 404, error: "Test not found" }

  if (role !== "ADMIN" && test.createdById !== userId) {
    return { status: 403, error: "Forbidden: You do not own this test" }
  }

  const now = new Date()
  const updated = await prisma.examTest.update({
    where: { id: testId },
    data: {
      isArchived,
      archivedAt: isArchived ? now : null,
      isPublished: isArchived ? false : test.isPublished,
    },
  })

  safeRevalidateTag("exam-series")
  if (test.series?.slug) {
    safeRevalidatePath(`/admin/test-series/package/${test.series.slug}`)
    safeRevalidatePath(`/teacher/test-series/package/${test.series.slug}`)
  }
  safeRevalidatePath(`/admin/test-series`)
  safeRevalidatePath(`/teacher/test-series`)

  await writeDualAuditLog({
    actorId: userId,
    action: isArchived ? ("ARCHIVE" as any) : "RESTORE_VERSION",
    targetId: test.id,
    entityType: "EXAM_TEST",
    details: {
      isArchived,
      testTitle: test.title,
    },
  })

  return { status: 200, data: updated }
}

/**
 * Convenience helper to archive an exam test
 */
export async function archiveExamTest(params: {
  testId: string
  userId: string
  role: string
}) {
  return toggleArchiveExamTest({ ...params, isArchived: true })
}

/**
 * Convenience helper to restore an archived exam test
 */
export async function restoreExamTest(params: {
  testId: string
  userId: string
  role: string
}) {
  return toggleArchiveExamTest({ ...params, isArchived: false })
}

/**
 * Reorders tests inside a package by updating order indices.
 */
export async function reorderPackageTests({
  packageIdOrSlug,
  testIdsInOrder,
  userId,
  role,
}: {
  packageIdOrSlug: string
  testIdsInOrder: string[]
  userId: string
  role: string
}): Promise<{ status: 200 | 403 | 404; success: boolean; error?: string }> {
  const series = await prisma.examSeries.findFirst({
    where: {
      OR: [{ id: packageIdOrSlug }, { slug: packageIdOrSlug }],
    },
  })

  if (!series) return { status: 404, success: false, error: "Package not found" }
  if (role !== "ADMIN" && series.createdById !== userId) {
    return { status: 403, success: false, error: "Forbidden: You do not own this package" }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < testIdsInOrder.length; i++) {
      const id = testIdsInOrder[i]
      await tx.examTest.updateMany({
        where: { id, seriesId: series.id },
        data: { order: i },
      })
    }
  })

  safeRevalidateTag("exam-series")
  safeRevalidatePath(`/admin/test-series/package/${series.slug}`)
  safeRevalidatePath(`/teacher/test-series/package/${series.slug}`)
  safeRevalidatePath(`/test-series/${series.slug}`)

  await writeDualAuditLog({
    actorId: userId,
    action: "REORDER",
    targetId: series.id,
    entityType: "EXAM_SERIES",
    details: {
      testOrder: testIdsInOrder,
    },
  })

  return { status: 200, success: true }
}

/**
 * Performs bulk actions on an array of test IDs: publish, unpublish, accessMode, archive, detach, delete.
 */
export async function bulkManageTests({
  testIds,
  action,
  payload,
  userId,
  role,
}: {
  testIds: string[]
  action:
    | "publish"
    | "unpublish"
    | "accessMode"
    | "archive"
    | "detach"
    | "delete"
    | "quick_first_n_free"
    | "revert_states"
  payload?: any
  userId: string
  role: string
}): Promise<{ status: 200 | 400 | 403 | 409; affected: number; error?: string }> {
  if (!Array.isArray(testIds) || testIds.length === 0) {
    return { status: 400, affected: 0, error: "No test IDs provided" }
  }

  // Filter owned tests if not admin
  const where: any = { id: { in: testIds } }
  if (role !== "ADMIN") {
    where.createdById = userId
  }

  const eligibleTests = await prisma.examTest.findMany({
    where,
    select: { id: true, title: true, seriesId: true, isPublished: true },
  })

  const eligibleIds = eligibleTests.map((t) => t.id)
  if (eligibleIds.length === 0) {
    return { status: 403, affected: 0, error: "No authorized tests to modify" }
  }

  if (action === "publish") {
    await prisma.examTest.updateMany({
      where: { id: { in: eligibleIds } },
      data: { isPublished: true, isArchived: false },
    })
  } else if (action === "unpublish") {
    await prisma.examTest.updateMany({
      where: { id: { in: eligibleIds } },
      data: { isPublished: false },
    })
  } else if (action === "accessMode") {
    const accessMode = String(payload?.accessMode || "PRO").toUpperCase() === "FREE" ? "FREE" : "PRO"
    await prisma.examTest.updateMany({
      where: { id: { in: eligibleIds } },
      data: { accessMode },
    })
  } else if (action === "archive") {
    const now = new Date()
    await prisma.examTest.updateMany({
      where: { id: { in: eligibleIds } },
      data: { isArchived: true, archivedAt: now, isPublished: false },
    })
  } else if (action === "detach") {
    const unassigned = await ensureUnassignedSystemSeries()
    await prisma.examTest.updateMany({
      where: { id: { in: eligibleIds } },
      data: { seriesId: unassigned.id },
    })
  } else if (action === "quick_first_n_free") {
    await prisma.examTest.updateMany({
      where: { id: { in: eligibleIds } },
      data: { accessMode: "FREE", gateMode: "free", previewPercentage: 100 },
    })
    await writeDualAuditLog({
      actorId: userId,
      action: "UPDATE",
      targetId: eligibleIds[0] || "bulk",
      entityType: "EXAM_TEST",
      details: {
        actionType: "QUICK_FIRST_N_FREE",
        affectedCount: eligibleIds.length,
        testIds: eligibleIds,
      },
    })
  } else if (action === "revert_states") {
    if (Array.isArray(payload?.snapshots)) {
      // Check for concurrent modifications between apply and undo
      const currentTests = await prisma.examTest.findMany({
        where: { id: { in: eligibleIds } },
        select: {
          id: true,
          title: true,
          gateMode: true,
          previewPercentage: true,
          accessMode: true,
          updatedAt: true,
        },
      })
      const testMap = new Map(currentTests.map((t) => [t.id, t]))

      const conflicts: string[] = []
      if (payload.expectedState) {
        for (const item of payload.snapshots) {
          if (!eligibleIds.includes(item.id)) continue
          const current = testMap.get(item.id)
          if (!current) continue
          if (
            (payload.expectedState.gateMode !== undefined &&
              current.gateMode !== payload.expectedState.gateMode) ||
            (payload.expectedState.accessMode !== undefined &&
              current.accessMode !== payload.expectedState.accessMode)
          ) {
            conflicts.push(current.title || item.id)
          }
        }
      }

      if (conflicts.length > 0) {
        return {
          status: 409,
          affected: 0,
          error: `Concurrent modification detected: "${conflicts.join(
            '", "'
          )}" was modified after the bulk change. Undo cancelled to prevent overwriting.`,
        }
      }

      for (const item of payload.snapshots) {
        if (!eligibleIds.includes(item.id)) continue
        await prisma.examTest.update({
          where: { id: item.id },
          data: {
            gateMode: item.gateMode,
            previewPercentage: item.previewPercentage,
            accessMode: item.accessMode,
          },
        })
      }
      await writeDualAuditLog({
        actorId: userId,
        action: "UPDATE",
        targetId: eligibleIds[0] || "bulk",
        entityType: "EXAM_TEST",
        details: {
          actionType: "UNDO_QUICK_FIRST_N_FREE",
          revertedCount: payload.snapshots.length,
        },
      })
    }
  } else if (action === "delete") {
    // Only delete tests that have 0 student attempts
    const attempts = await prisma.examAttempt.findMany({
      where: { testId: { in: eligibleIds } },
      select: { testId: true },
    })
    const testIdsWithAttempts = new Set(attempts.map((a) => a.testId))
    const deletableIds = eligibleIds.filter((id) => !testIdsWithAttempts.has(id))

    if (deletableIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        const sections = await tx.examSection.findMany({
          where: { testId: { in: deletableIds } },
          select: { id: true },
        })
        const sectionIds = sections.map((s) => s.id)
        if (sectionIds.length > 0) {
          await tx.examQuestion.deleteMany({ where: { sectionId: { in: sectionIds } } })
        }
        await tx.examSection.deleteMany({ where: { testId: { in: deletableIds } } })
        await tx.examTest.deleteMany({ where: { id: { in: deletableIds } } })
      })
    }

    // Any tests with attempts are archived instead of hard-deleted
    const archivableIds = eligibleIds.filter((id) => testIdsWithAttempts.has(id))
    if (archivableIds.length > 0) {
      const now = new Date()
      await prisma.examTest.updateMany({
        where: { id: { in: archivableIds } },
        data: { isArchived: true, archivedAt: now, isPublished: false },
      })
    }
  }

  safeRevalidateTag("exam-series")
  safeRevalidatePath("/test-series")
  safeRevalidatePath("/admin/test-series")
  safeRevalidatePath("/teacher/test-series")

  await writeDualAuditLog({
    actorId: userId,
    action: `BULK_${action.toUpperCase()}`,
    targetId: eligibleIds.join(","),
    entityType: "EXAM_TEST",
    details: {
      testCount: eligibleIds.length,
      action,
      payload,
    },
  })

  return { status: 200, affected: eligibleIds.length }
}

/**
 * Generates CSV string of tests list (admin or teacher, audit-logged)
 */
export async function exportTestsCsv({
  userId,
  role,
}: {
  userId: string
  role: string
}): Promise<{ status: 200 | 403; csv?: string; error?: string }> {
  if (role !== "ADMIN" && role !== "TEACHER") {
    return { status: 403, error: "Forbidden: Admin or Teacher required to export data" }
  }

  const where: any = {}
  if (role !== "ADMIN") {
    where.createdById = userId
  }

  const tests = await prisma.examTest.findMany({
    where,
    include: {
      series: { select: { title: true, slug: true } },
      _count: { select: { attempts: true, sections: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const headers = [
    "Test ID",
    "Title",
    "Package Title",
    "Package Slug",
    "Test Type",
    "Access Mode",
    "Duration (Mins)",
    "Total Questions",
    "Total Marks",
    "Published",
    "Archived",
    "Attempts Count",
    "Created At",
  ]

  const rows = tests.map((t) => [
    `"${t.id}"`,
    `"${(t.title || "").replace(/"/g, '""')}"`,
    `"${(t.series?.title || "").replace(/"/g, '""')}"`,
    `"${t.series?.slug || ""}"`,
    `"${t.testType}"`,
    `"${t.accessMode}"`,
    t.durationMinutes,
    t.totalQuestions,
    t.totalMarks,
    t.isPublished ? "YES" : "NO",
    t.isArchived ? "YES" : "NO",
    t._count.attempts,
    `"${t.createdAt.toISOString()}"`,
  ])

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

  await writeDualAuditLog({
    actorId: userId,
    action: "EXPORT_CSV" as any,
    targetId: "ALL_TESTS",
    entityType: "EXAM_TEST",
    details: { exportedCount: tests.length },
  })

  return { status: 200, csv }
}
