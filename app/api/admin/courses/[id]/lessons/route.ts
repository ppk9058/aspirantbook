import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can create lessons" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.chapterId || !body.title) {
      return NextResponse.json({ error: "Chapter ID and lesson title are required" }, { status: 400 })
    }

    const highestLesson = await prisma.lesson.findFirst({
      where: { chapterId: body.chapterId },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const newOrder = (highestLesson?.order || 0) + 1

    const lesson = await prisma.lesson.create({
      data: {
        chapterId: body.chapterId,
        title: body.title.trim(),
        type: body.type || (body.videoUrl ? "VIDEO" : "READING"),
        order: body.order || newOrder,
        videoUrl: body.videoUrl || null,
        durationText: body.durationText || null,
        isTrial: Boolean(body.isTrial),
        attachmentType: body.attachmentType || null,
        attachmentName: body.attachmentName || null,
        attachmentUrl: body.attachmentUrl || null,
        content: body.content || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      },
    })

    return NextResponse.json(lesson, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/courses/[id]/lessons error:", error)
    return NextResponse.json({ error: error.message || "Failed to create lesson" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    const data: any = {}
    if (body.title !== undefined) data.title = body.title.trim()
    if (body.type !== undefined) data.type = body.type
    if (body.videoUrl !== undefined) data.videoUrl = body.videoUrl || null
    if (body.durationText !== undefined) data.durationText = body.durationText || null
    if (body.isTrial !== undefined) data.isTrial = Boolean(body.isTrial)
    if (body.attachmentType !== undefined) data.attachmentType = body.attachmentType || null
    if (body.attachmentName !== undefined) data.attachmentName = body.attachmentName || null
    if (body.attachmentUrl !== undefined) data.attachmentUrl = body.attachmentUrl || null
    if (body.content !== undefined) data.content = body.content || null
    if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null

    const updated = await prisma.lesson.update({
      where: { id: body.lessonId },
      data,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/admin/courses/[id]/lessons error:", error)
    return NextResponse.json({ error: error.message || "Failed to update lesson" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")
    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    await prisma.lesson.delete({ where: { id: lessonId } })
    return NextResponse.json({ success: true, message: "Lesson deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/admin/courses/[id]/lessons error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete lesson" }, { status: 500 })
  }
}
