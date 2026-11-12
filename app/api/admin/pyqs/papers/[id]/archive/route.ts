import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getPaperById, updatePaper } from "@/lib/pyqs-service"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

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
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can archive or restore papers" },
        { status: 403 }
      )
    }

    const { id } = await params
    const paper = await getPaperById(id)
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }

    if (user.role !== "ADMIN") {
      if (!paper.creatorId || paper.creatorId !== user.userId) {
        return NextResponse.json(
          { error: "Forbidden: You can only archive or restore papers you created" },
          { status: 403 }
        )
      }
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
      targetStatus = parsed.data.isArchived ? "ARCHIVED" : "PUBLISHED"
    } else {
      // Toggle if no explicit flag passed
      targetStatus = paper.status === "ARCHIVED" ? "PUBLISHED" : "ARCHIVED"
    }

    const updated = await updatePaper({
      id,
      status: targetStatus,
    })

    await writeDualAuditLog({
      actorId: user.userId || "unknown",
      action: targetStatus === "ARCHIVED" ? "ARCHIVE" : "RESTORE",
      targetId: id,
      entityType: "PYQ_PAPER",
      details: {
        title: paper.title,
        previousStatus: paper.status,
        newStatus: targetStatus,
      },
    })

    revalidatePath("/admin/pyqs")
    revalidatePath("/pyqs")

    return NextResponse.json({
      success: true,
      data: updated,
      status: targetStatus,
      message:
        targetStatus === "ARCHIVED"
          ? `Paper "${paper.title}" archived successfully`
          : `Paper "${paper.title}" restored successfully`,
    })
  } catch (error: any) {
    console.error("POST /api/admin/pyqs/papers/[id]/archive error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update paper archive state" },
      { status: 500 }
    )
  }
}
