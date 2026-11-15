import { prisma } from "@/lib/prisma"
import { resolveAccess } from "@/lib/authwall/resolveAccess"
import { toSafeCourseDto } from "@/lib/courses/course-dto"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"
import { findLessonBySlug, extractLessonText } from "./lesson-slug"

export class TutorialUnavailableError extends Error {
  readonly code = "TUTORIAL_UNAVAILABLE"

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "TutorialUnavailableError"
  }
}

export function isBuildTimePrerender(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build"
}

export interface TutorialLessonItem {
  id: string
  title: string
  order: number
  content: string | null
  duration?: number | null
  durationText?: string | null
  gateMode?: string | null
  previewPercentage?: number | null
  externalId?: string | null
  createdAt?: Date
  isLockedForGuest?: boolean
  gateTitle?: string | null
  gateSubtitle?: string | null
  effectivePercentage?: number
  totalItemsCount?: number
  previewCount?: number
}

export async function loadTutorialWithLessons(
  courseSlug: string,
  userRole?: string | null,
  userId?: string | null,
  isBot = false
) {
  try {
    const course = await prisma.course.findFirst({
      where: { OR: [{ slug: courseSlug }, { id: courseSlug }] },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                order: true,
                content: true,
                duration: true,
                durationText: true,
                gateMode: true,
                previewPercentage: true,
                externalId: true,
                createdAt: true,
                versions: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { blocks: true },
                },
              },
            },
          },
        },
      },
    })

    if (!course || !isCourseVisibleToUser(course, userRole, userId)) {
      return null
    }

    const courseChapters = course.chapters || []

    for (const ch of courseChapters) {
      for (const l of ch.lessons || []) {
        if ((!l.content || l.content.length === 0) && (l as any).versions?.[0]?.blocks) {
          l.content = JSON.stringify((l as any).versions[0].blocks)
        }
      }
    }

    const isEditor = userRole === "ADMIN" || userRole === "TEACHER"
    const isPaidCourse = Boolean(course.isPremium || (course.price && course.price > 0))

    let hasAccess = false
    if (userId) {
      if (isEditor || !isPaidCourse) {
        hasAccess = true
      } else {
        try {
          const [subCheck, enrollment] = await Promise.all([
            prisma.subscription.findFirst({
              where: {
                userId,
                status: "ACTIVE",
                endDate: { gte: new Date() },
              },
              select: { id: true },
            }),
            prisma.enrollment.findUnique({
              where: {
                userId_courseId: {
                  userId,
                  courseId: course.id,
                },
              },
              select: { id: true },
            }),
          ])
          if (subCheck || enrollment) {
            hasAccess = true
          }
        } catch {
          hasAccess = isEditor || !isPaidCourse
        }
      }
    } else {
      hasAccess = !isPaidCourse
    }

    const viewer = {
      userId: userId || null,
      role: userRole || null,
      isVerifiedBot: isBot,
    }

    // Apply Server-Side Slicing via Centralized resolveAccess
    for (const ch of courseChapters) {
      for (const l of ch.lessons || []) {
        const rawLessonMode = (l as any).gateMode
        const effectiveGateMode =
          rawLessonMode && rawLessonMode !== "inherit" ? rawLessonMode : (ch as any).gateMode
        const effectivePreviewPct =
          (l as any).previewPercentage !== null && (l as any).previewPercentage !== undefined
            ? (l as any).previewPercentage
            : (ch as any).previewPercentage

        const access = resolveAccess({
          viewer,
          content: l.content,
          containerGate: course,
          itemGate: {
            gateMode: effectiveGateMode,
            previewPercentage: effectivePreviewPct,
          },
          isOwner: (course as any).createdById === userId || (course as any).userId === userId,
        })

        if (access.isLockedForGuest) {
          if (access.effectivePercentage === 0 || access.previewBlocks.length === 0) {
            l.content = ""
          } else if (typeof l.content === "string" && l.content.trim().startsWith("{")) {
            l.content = JSON.stringify({ blocks: access.previewBlocks })
          } else if (typeof l.content === "string" && l.content.trim().startsWith("[")) {
            l.content = JSON.stringify(access.previewBlocks)
          } else {
            l.content = access.previewBlocks
              .map((b) => (typeof b === "string" ? b : b.html || b.content || ""))
              .join("\n")
          }
          ;(l as any).isLockedForGuest = true
          ;(l as any).gateTitle = access.gateTitle
          ;(l as any).gateSubtitle = access.gateSubtitle
          ;(l as any).effectivePercentage = access.effectivePercentage
          ;(l as any).totalItemsCount = access.totalItemsCount
          ;(l as any).previewCount = access.previewCount
        }
      }
    }

    const safeCourse = toSafeCourseDto(course, hasAccess, hasAccess)

    const allLessons: TutorialLessonItem[] = courseChapters.flatMap((ch) =>
      (ch.lessons || []).map((l) => ({
        id: l.id,
        title: l.title,
        order: l.order,
        content: l.content,
        duration: l.duration,
        durationText: l.durationText,
        gateMode: (l as any).gateMode,
        previewPercentage: (l as any).previewPercentage,
        externalId: l.externalId,
        createdAt: l.createdAt,
        isLockedForGuest: (l as any).isLockedForGuest,
        gateTitle: (l as any).gateTitle,
        gateSubtitle: (l as any).gateSubtitle,
        effectivePercentage: (l as any).effectivePercentage,
        totalItemsCount: (l as any).totalItemsCount,
        previewCount: (l as any).previewCount,
      }))
    )

    return {
      course: safeCourse,
      rawCourse: course,
      chapters: safeCourse.chapters,
      allLessons,
      hasAccess,
      isEditor,
    }
  } catch (error) {
    if (isBuildTimePrerender()) {
      console.error(`[tutorials] build ran without DB for tutorial ${courseSlug}; skipping prerender.`)
      return null
    }
    throw new TutorialUnavailableError(
      `Failed to read tutorial ${courseSlug}; keeping last good page.`,
      { cause: error }
    )
  }
}
