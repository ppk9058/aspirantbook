import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { logContentAudit } from "@/lib/actions/admin/audit"
import { importTutorialPackage } from "@/lib/actions/admin/tutorial-import"
import { validateOrMapCanonicalGoals } from "@/lib/tutorials-goal-categories"
import { chunkContent, computeContentHash } from "@/lib/authwall/chunker"
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags"
import { creatorIdFor } from "@/lib/auth/course-access"
import { requireManagedCourse } from "@/lib/auth/course-access-server"

interface LessonImport {
  title: string
  content?: string
  durationText?: string
  duration?: number
  order?: number
}

interface ChapterImport {
  title: string
  description?: string
  order?: number
  lessons?: LessonImport[]
}

interface TutorialImportPayload {
  courseId?: string
  title?: string
  technology?: string
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  description?: string
  theme?: any
  status?: "PUBLISHED" | "DRAFT"
  chapters?: ChapterImport[]
  // Schema v1 fields
  schema?: number
  meta?: any
  phases?: any[]
  dryRun?: boolean
  publishImmediately?: boolean
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can import tutorials" },
        { status: 403 }
      )
    }

    const body: TutorialImportPayload = await req.json()

    // Schema v1 check: If meta and phases are present, use importTutorialPackage
    if (body.phases && (body.meta || body.schema)) {
      // A9: the v1 importer defaults to DRAFT; a teacher can never publish.
      const wantsPublish = user.role === "ADMIN" && (
        body.publishImmediately ?? body.status === "PUBLISHED"
      )
      const result = await importTutorialPackage(body, {
        dryRun: body.dryRun,
        publishImmediately: Boolean(wantsPublish),
        createdById: creatorIdFor(user) ?? undefined,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error || "Failed to import tutorial package" }, { status: 400 })
      }

      return NextResponse.json(result, { status: 200 })
    }
    const {
      courseId,
      title,
      technology = "skills,data-science",
      difficulty = "BEGINNER",
      description = "Comprehensive structured tutorial created via Tutorial Studio.",
      theme,
      // A9: imports are drafts unless publishing is explicitly requested by an
      // administrator. This matches the v1 importer's behaviour.
      status = "DRAFT",
      chapters = [],
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Tutorial title is required" }, { status: 400 })
    }

    const goalValidation = validateOrMapCanonicalGoals(technology)
    const canonicalTechnology = goalValidation.isValid
      ? goalValidation.validSlugs.join(",")
      : ""
    const requestedStatus = status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
    const effectiveStatus = goalValidation.isValid
      ? user.role === "ADMIN"
        ? requestedStatus
        : "DRAFT"
      : "DRAFT"
    const isPublished = effectiveStatus === "PUBLISHED"

    // A9: validate the chapter/lesson shape up front so malformed input is a
    // 400 and never a half-applied import.
    if (chapters !== undefined && !Array.isArray(chapters)) {
      return NextResponse.json({ error: "chapters must be an array" }, { status: 400 })
    }
    for (const [chIdx, ch] of (chapters as ChapterImport[]).entries()) {
      if (!ch || typeof ch.title !== "string" || !ch.title.trim()) {
        return NextResponse.json(
          { error: `chapters[${chIdx}].title is required` },
          { status: 400 }
        )
      }
      if (ch.lessons !== undefined && !Array.isArray(ch.lessons)) {
        return NextResponse.json(
          { error: `chapters[${chIdx}].lessons must be an array` },
          { status: 400 }
        )
      }
      for (const [lIdx, lesson] of (ch.lessons || []).entries()) {
        if (!lesson || typeof lesson.title !== "string" || !lesson.title.trim()) {
          return NextResponse.json(
            { error: `chapters[${chIdx}].lessons[${lIdx}].title is required` },
            { status: 400 }
          )
        }
      }
    }

    // If no chapters provided, create a default orientation chapter
    const normalizedChapters =
      chapters.length > 0
        ? chapters
        : [
            {
              title: "Chapter 1: Overview & Foundation",
              description: "Getting started with core principles",
              lessons: [
                {
                  title: title.trim(),
                  content: description,
                  durationText: "15 min read",
                  duration: 15,
                },
              ],
            },
          ]

    let course: any = null

    if (courseId) {
      // A8: teachers may only import into a course they own.
      const access = await requireManagedCourse(user, courseId)
      if (access.response) return access.response

      // Find existing course
      course = await prisma.course.findUnique({ where: { id: courseId } })
      if (course) {
        // B-025/A9: build every row up front and insert in two batched
        // statements instead of one chapter.create + one lesson.create per row.
        const chapterRows = normalizedChapters.map((ch, chIdx) => ({
          id: crypto.randomUUID(),
          title: ch.title.trim() || `Chapter ${chIdx + 1}`,
          order: ch.order || chIdx + 1,
          description: ch.description ? ch.description.trim() : null,
          courseId: course.id,
        }))

        const lessonRows = chapterRows.flatMap((chapterRow, chIdx) => {
          const ch = normalizedChapters[chIdx]
          const lessonItems =
            ch.lessons && ch.lessons.length > 0
              ? ch.lessons
              : [{ title: ch.title, content: description }]
          return lessonItems.map((l, lIdx) => {
            const lessonContent = l.content || description
            const blocks = chunkContent(lessonContent)
            return {
              id: crypto.randomUUID(),
              title: l.title.trim() || `Lesson ${lIdx + 1}`,
              order: l.order || lIdx + 1,
              type: "READING" as const,
              content: lessonContent,
              blockCount: blocks.length,
              contentHash: computeContentHash(blocks),
              durationText: l.durationText || "15 min read",
              duration: l.duration || 15,
              // A9: imported lessons are NOT free trials. Only an explicit
              // course-level trial unlocks content.
              isTrial: false,
              chapterId: chapterRow.id,
            }
          })
        })

        // A9: the delete and the re-create must be atomic, otherwise a failure
        // between them leaves the course with no chapters at all.
        await prisma.$transaction(async (tx) => {
          await tx.chapter.deleteMany({ where: { courseId: course!.id } })
          await tx.course.update({
            where: { id: course!.id },
            data: {
              title: title.trim(),
              description: description.trim(),
              technology: canonicalTechnology || course!.technology,
              difficulty: (difficulty as any) || "BEGINNER",
              status: effectiveStatus as any,
              isPublished,
              metadataJson: theme ? JSON.stringify({ theme }) : undefined,
            },
          })
          await tx.chapter.createMany({ data: chapterRows })
          await tx.lesson.createMany({ data: lessonRows })
        })
      }
    }

    if (!course) {
      // Generate clean unique slug
      let baseSlug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      if (!baseSlug) baseSlug = `tutorial-${Date.now()}`

      let slug = baseSlug
      const existing = await prisma.course.findUnique({ where: { slug } })
      if (existing) {
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
      }

      // Create new course with nested chapters and lessons
      // A8: teachers create private drafts; only an ADMIN publishes directly.
      const isTeacherCreate = user.role === "TEACHER"
      const createdStatus = isTeacherCreate ? "DRAFT" : (effectiveStatus as any) || "PUBLISHED"
      const createdPublished = isTeacherCreate ? false : isPublished

      course = await prisma.course.create({
        data: {
          title: title.trim(),
          slug,
          description: description.trim(),
          technology: canonicalTechnology,
          difficulty: (difficulty as any) || "BEGINNER",
          isPremium: false,
          status: createdStatus,
          isPublished: createdPublished,
          createdById: creatorIdFor(user),
          thumbnailUrl: "/course-bpsc.svg",
          hasTrialLesson: true,
          metadataJson: theme ? JSON.stringify({ theme }) : null,
          chapters: {
            create: normalizedChapters.map((ch, chIdx) => ({
              title: ch.title.trim() || `Chapter ${chIdx + 1}`,
              order: ch.order || chIdx + 1,
              description: ch.description ? ch.description.trim() : null,
              lessons: {
                create: (ch.lessons && ch.lessons.length > 0 ? ch.lessons : [{ title: ch.title }]).map(
                  (l, lIdx) => {
                    const lessonContent = l.content || description
                    const blocks = chunkContent(lessonContent)
                    return {
                      title: l.title.trim() || `Lesson ${lIdx + 1}`,
                      order: l.order || lIdx + 1,
                      type: "READING",
                      content: lessonContent,
                      blockCount: blocks.length,
                      contentHash: computeContentHash(blocks),
                      durationText: l.durationText || "15 min read",
                      duration: l.duration || 15,
                      // A9: imported lessons are not free trials.
                      isTrial: false,
                    }
                  }
                ),
              },
            })),
          },
        },
        include: {
          chapters: {
            include: { lessons: true },
            orderBy: { order: "asc" },
          },
        },
      })
    }

    const fullCourse = await prisma.course.findUnique({
      where: { id: course.id },
      include: {
        chapters: {
          include: { lessons: true },
          orderBy: { order: "asc" },
        },
      },
    })

    const finalChapters = fullCourse?.chapters || []
    const totalLessonsCount = finalChapters.reduce((sum, ch) => sum + ch.lessons.length, 0)

    safeRevalidateTags(CACHE_TAGS.tutorials, CACHE_TAGS.courses)

    await logContentAudit({
      entityId: course.id,
      entityType: "COURSE",
      action: "CREATE",
      details: {
        source: "AI_IMPORT_STUDIO",
        title: course.title,
        chaptersCount: finalChapters.length,
        totalLessons: totalLessonsCount,
      },
    })

    return NextResponse.json(
      {
        success: true,
        courseId: course.id,
        slug: course.slug,
        title: course.title,
        chaptersCount: finalChapters.length,
        totalLessons: totalLessonsCount,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("POST /api/admin/tutorials/import error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import tutorial package" },
      { status: 500 }
    )
  }
}
