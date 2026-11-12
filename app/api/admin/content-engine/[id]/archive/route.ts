import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const archiveSchema = z.object({
  isArchived: z.boolean().optional(),
  status: z.enum(["ARCHIVED", "PUBLISHED", "DRAFT"]).optional(),
})

export async function POST(
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
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    const rawBody = await req.json().catch(() => ({}))
    const parsed = archiveSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid archive request payload" }, { status: 400 })
    }

    let targetStatus: "ARCHIVED" | "PUBLISHED" | "DRAFT"
    if (parsed.data.status) {
      targetStatus = parsed.data.status
    } else if (parsed.data.isArchived !== undefined) {
      targetStatus = parsed.data.isArchived ? "ARCHIVED" : "DRAFT"
    } else {
      // Toggle
      targetStatus = question.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED"
    }

    const isPublished = targetStatus === "PUBLISHED"

    const updated = await prisma.contentEngineQuestion.update({
      where: { id },
      data: {
        status: targetStatus,
        isPublished,
      },
    })

    await writeDualAuditLog({
      actorId: user.userId || "admin",
      action: targetStatus === "ARCHIVED" ? "ARCHIVE" : "RESTORE",
      targetId: id,
      entityType: "ARTICLE",
      details: {
        shortId: question.shortId,
        previousStatus: question.status,
        newStatus: targetStatus,
        isPublished,
      },
    })

    revalidatePath("/admin/content-engine")

    return NextResponse.json({
      success: true,
      data: updated,
      status: targetStatus,
      isPublished,
      message:
        targetStatus === "ARCHIVED"
          ? `Question "${question.shortId}" archived successfully`
          : `Question "${question.shortId}" restored to ${targetStatus}`,
    })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/[id]/archive error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update archive state" },
      { status: 500 }
    )
  }
}
