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
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can archive or restore documents" },
        { status: 403 }
      )
    }

    const { id } = await params
    const item = await prisma.currentAffairsPdf.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Role-based ownership check
    if (user.role === "TEACHER" && item.createdById !== user.userId) {
      return NextResponse.json(
        { error: "Access Denied: Teachers can only archive or restore their own documents" },
        { status: 403 }
      )
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
      // Toggle
      targetStatus = item.status === "ARCHIVED" ? "PUBLISHED" : "ARCHIVED"
    }

    const updated = await prisma.currentAffairsPdf.update({
      where: { id },
      data: { status: targetStatus },
    })

    await writeDualAuditLog({
      actorId: user.userId || "unknown",
      action: targetStatus === "ARCHIVED" ? "ARCHIVE" : "RESTORE",
      targetId: id,
      entityType: "CURRENT_AFFAIRS",
      details: {
        title: item.title,
        previousStatus: item.status,
        newStatus: targetStatus,
      },
    })

    revalidatePath("/admin/current-affairs")
    revalidatePath("/current-affairs")

    return NextResponse.json({
      success: true,
      data: updated,
      status: targetStatus,
      message:
        targetStatus === "ARCHIVED"
          ? `Document "${item.title}" archived successfully`
          : `Document "${item.title}" restored successfully`,
    })
  } catch (error: any) {
    console.error("POST /api/admin/current-affairs/[id]/archive error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update archive state" },
      { status: 500 }
    )
  }
}
