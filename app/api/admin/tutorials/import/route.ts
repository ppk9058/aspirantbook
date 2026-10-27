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
      const result = await importTutorialPackage(body, {
        dryRun: body.dryRun,
        publishImmediately: body.publishImmediately ?? (body.status === "PUBLISHED"),
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
      status = "PUBLISHED",
      chapters = [],
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Tutorial title is required" }, { status: 400 })
    }

    const goalValidation = validateOrMapCanonicalGoals(technology)
    const canonicalTechnology = goalValidation.isValid
      ? goalValidation.validSlugs.join(",")
      : ""
    const effectiveStatus = goalValidation.isValid
      ? ((status as any) || "PUBLISHED")
      : "DRAFT"
    const isPublished = effectiveStatus === "PUBLISHED"

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
        // Delete existing chapters to replace with imported curriculum
        await prisma.chapter.deleteMany({ where: { courseId: course.id } })

        // Update metadata
        await prisma.course.update({
          where: { id: course.id },
          data: {
            title: title.trim(),
            description: description.trim(),
            technology: canonicalTechnology || course.technology,
            difficulty: (difficulty as any) || "BEGINNER",
            status: (effectiveStatus as any) || "PUBLISHED",
            isPublished,
            metadataJson: theme ? JSON.stringify({ theme }) : undefined,
          },
        })

        // B-025: build every row up front and insert in two batched statements
        // instead of one chapter.create + one lesson.create per row (N+1).
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
              isTrial: true,
              chapterId: chapterRow.id,
            }
          })
        })

        await prisma.$transaction([
          prisma.chapter.createMany({ data: chapterRows }),
          prisma.lesson.createMany({ data: lessonRows }),
        ])
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
                      isTrial: true,
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
