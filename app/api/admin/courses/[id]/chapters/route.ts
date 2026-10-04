import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can add chapters" }, { status: 403 })
    }

    const { id: courseId } = await params
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

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/admin/courses/[id]/chapters error:", error)
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

    await prisma.chapter.delete({ where: { id: chapterId } })
    return NextResponse.json({ success: true, message: "Chapter deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/admin/courses/[id]/chapters error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete chapter" }, { status: 500 })
  }
}
