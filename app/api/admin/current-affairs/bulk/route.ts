import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "unpublish", "archive", "restore"]),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can perform bulk actions on documents" },
        { status: 403 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = bulkSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload: ids array and valid action required" },
        { status: 400 }
      )
    }

    const { ids, action } = parsed.data

    const where: any = { id: { in: ids } }
    if (user.role === "TEACHER") {
      where.createdById = user.userId
    }

    const matchingItems = await prisma.currentAffairsPdf.findMany({
      where,
      select: { id: true, title: true },
    })

    const matchingIds = matchingItems.map((item) => item.id)
    if (matchingIds.length === 0) {
      return NextResponse.json({
        success: true,
        affected: 0,
        message: "No matching documents found to update",
      })
    }

    let nextStatus: "PUBLISHED" | "DRAFT" | "ARCHIVED"
    if (action === "publish" || action === "restore") nextStatus = "PUBLISHED"
    else if (action === "unpublish") nextStatus = "DRAFT"
    else nextStatus = "ARCHIVED"

    const res = await prisma.currentAffairsPdf.updateMany({
      where: { id: { in: matchingIds } },
      data: { status: nextStatus },
    })

    await writeDualAuditLog({
      actorId: user.userId || "unknown",
      action: `BULK_${action.toUpperCase()}`,
      targetId: "bulk-current-affairs",
      entityType: "CURRENT_AFFAIRS",
      details: {
        action,
        requestedCount: ids.length,
        affected: res.count,
        targetStatus: nextStatus,
      },
    })

    revalidatePath("/admin/current-affairs")
    revalidatePath("/current-affairs")

    return NextResponse.json({
      success: true,
      affected: res.count,
      message: `Bulk action "${action}" completed for ${res.count} document(s)`,
    })
  } catch (error: any) {
    console.error("POST /api/admin/current-affairs/bulk error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process bulk action on documents" },
      { status: 500 }
    )
  }
}
