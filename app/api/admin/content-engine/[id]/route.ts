import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Admin role required" },
        { status: 403 }
      )
    }

    const { id } = await params
    const question = await prisma.contentEngineQuestion.findUnique({
      where: { id },
      include: {
        _count: { select: { translations: true } },
        override: true,
        translations: true,
      },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: question })
  } catch (error: any) {
    console.error("GET /api/admin/content-engine/[id] error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch question" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Admin role required" },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await prisma.contentEngineQuestion.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const updateData: any = {}

    if (body.q !== undefined) updateData.q = body.q
    if (body.options !== undefined) updateData.options = body.options
    if (body.answer !== undefined) updateData.answer = body.answer
    if (body.explanation !== undefined) updateData.explanation = body.explanation
    if (body.sub !== undefined) updateData.sub = body.sub
    if (body.top !== undefined) updateData.top = body.top
    if (body.exam !== undefined) updateData.exam = body.exam
    if (body.year !== undefined) updateData.year = body.year

    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === "PUBLISHED") {
        updateData.isPublished = true
        updateData.publishedAt = existing.publishedAt || new Date()
      } else if (body.status === "ARCHIVED" || body.status === "DRAFT") {
        updateData.isPublished = false
      }
    }

    const updated = await prisma.contentEngineQuestion.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { translations: true } },
        override: true,
      },
    })

    await writeDualAuditLog({
      actorId: user.userId || "admin",
      action: "UPDATE",
      targetId: id,
      entityType: "ARTICLE",
      details: { shortId: existing.shortId, changes: Object.keys(updateData) },
    })

    revalidatePath("/admin/content-engine")

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("PUT /api/admin/content-engine/[id] error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update question" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Admin role required" },
        { status: 403 }
      )
    }

    const { id } = await params
    const question = await prisma.contentEngineQuestion.findUnique({
      where: { id },
      include: {
        _count: { select: { translations: true } },
        override: true,
      },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Guard: Hard delete refused for PUBLISHED questions (steer to archive)
    if (question.status === "PUBLISHED" || question.isPublished) {
      return NextResponse.json(
        {
          error: "Published questions cannot be hard deleted. Archive the question instead.",
          status: 409,
          questionId: question.id,
          translationsCount: question._count?.translations || 0,
          hasOverride: Boolean(question.override),
        },
        { status: 409 }
      )
    }

    // Question is DRAFT or ARCHIVED: allow hard delete (translations and overrides cascade)
    const translationsCount = question._count?.translations || 0
    const hasOverride = Boolean(question.override)

    await prisma.contentEngineQuestion.delete({
      where: { id },
    })

    await writeDualAuditLog({
      actorId: user.userId || "admin",
      action: "DELETE",
      targetId: id,
      entityType: "ARTICLE",
      details: {
        shortId: question.shortId,
        translationsCount,
        hasOverride,
      },
    })

    revalidatePath("/admin/content-engine")

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
      translationsCount,
      hasOverride,
    })
  } catch (error: any) {
    console.error("DELETE /api/admin/content-engine/[id] error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete question" },
      { status: 500 }
    )
  }
}
