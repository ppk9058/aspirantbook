import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { requireManagedCourse, requireManagedChapter } from "@/lib/auth/course-access-server"
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags"

/**
 * B10: these studio routes wrote the chapter row and returned, so the cached
 * public course page (/courses/[slug], tagged "courses", 60s) kept serving the
 * old outline. Every mutation now drops the tag and refreshes the affected paths.
 */
function invalidateCourseContent(slug?: string | null) {
  safeRevalidateTags(CACHE_TAGS.courses)
  revalidatePath("/courses")
  revalidatePath("/admin/courses")
  if (slug) revalidatePath(`/courses/${slug}`)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can add chapters" }, { status: 403 })
    }

    const { id: courseId } = await params

    // A8: teachers may only add chapters to their own courses.
    const access = await requireManagedCourse(user, courseId)
    if (access.response) return access.response

    const body = await req.json()
    if (!body.title) {
      return NextResponse.json({ error: "Chapter title is required" }, { status: 400 })
    }

    const highestChapter = await prisma.chapter.findFirst({
      where: { courseId },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const newOrder = (highestChapter?.order || 0) + 1

    const chapter = await prisma.chapter.create({
      data: {
        title: body.title.trim(),
        order: body.order || newOrder,
        courseId,
      },
      include: {
        lessons: true,
      },
    })

    invalidateCourseContent(access.course.slug)
    return NextResponse.json(chapter, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/courses/[id]/chapters error:", error)
    return NextResponse.json({ error: error.message || "Failed to create chapter" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.chapterId || !body.title) {
      return NextResponse.json({ error: "Chapter ID and title are required" }, { status: 400 })
    }

    // A8: ownership is resolved from the chapter's course.
    const access = await requireManagedChapter(user, body.chapterId)
    if (access.response) return access.response

    const updated = await prisma.chapter.update({
      where: { id: body.chapterId },
      data: {
        title: body.title.trim(),
        order: body.order !== undefined ? Number(body.order) : undefined,
      },
      include: {
        lessons: true,
      },
    })

    invalidateCourseContent(access.course.slug)
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/admin/courses/[id]/chapters error:", error)
    return NextResponse.json({ error: error.message || "Failed to update chapter" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.chapterId) {
      return NextResponse.json({ error: "Chapter ID is required" }, { status: 400 })
    }

    const access = await requireManagedChapter(user, body.chapterId)
    if (access.response) return access.response

    const data: any = {}
    if (body.titleHi !== undefined) data.titleHi = body.titleHi?.toString().trim().slice(0, 200) || null
    if (body.subtopics !== undefined) {
      data.subtopics = Array.isArray(body.subtopics)
        ? body.subtopics.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 20)
        : []
    }
    if (body.subtopicsHi !== undefined) {
      data.subtopicsHi = Array.isArray(body.subtopicsHi)
        ? body.subtopicsHi.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 20)
        : []
    }
    if (body.unitId !== undefined) {
      if (body.unitId) {
        const course = await prisma.chapter.findUnique({
          where: { id: body.chapterId },
          select: { courseId: true },
        })
        const unit = await prisma.courseUnit.findFirst({
          where: { id: String(body.unitId), courseId: course?.courseId || "" },
          select: { id: true },
        })
        if (!unit) return NextResponse.json({ error: "Unit not found for this course" }, { status: 404 })
        data.unitId = unit.id
      } else {
        data.unitId = null
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const updated = await prisma.chapter.update({ where: { id: body.chapterId }, data })
    invalidateCourseContent(access.course.slug)
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PATCH /api/admin/courses/[id]/chapters error:", error)
    return NextResponse.json({ error: error.message || "Failed to update chapter" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const chapterId = searchParams.get("chapterId")
    if (!chapterId) {
      return NextResponse.json({ error: "Chapter ID is required" }, { status: 400 })
    }

    // A8: ownership is resolved from the chapter's course.
    const access = await requireManagedChapter(user, chapterId)
    if (access.response) return access.response

    await prisma.chapter.delete({ where: { id: chapterId } })
    invalidateCourseContent(access.course.slug)
    return NextResponse.json({ success: true, message: "Chapter deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/admin/courses/[id]/chapters error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete chapter" }, { status: 500 })
  }
}
