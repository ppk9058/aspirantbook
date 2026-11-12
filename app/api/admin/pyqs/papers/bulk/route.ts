import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { bulkManagePapers } from "@/lib/pyqs-service"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

const bulkSchema = z.object({
  paperIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "unpublish", "archive", "restore", "delete"]),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can perform bulk actions on papers" },
        { status: 403 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = bulkSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload: paperIds array and valid action required" },
        { status: 400 }
      )
    }

    const { paperIds, action } = parsed.data

    const result = await bulkManagePapers({
      paperIds,
      action,
      userId: user.userId || "",
      role: user.role,
    })

    await writeDualAuditLog({
      actorId: user.userId || "unknown",
      action: `BULK_${action.toUpperCase()}`,
      targetId: "bulk-pyq-papers",
      entityType: "PYQ_PAPER",
      details: {
        action,
        requestedCount: paperIds.length,
        affected: result.affected,
        blocked: (result as any).blocked,
      },
    })

    revalidatePath("/admin/pyqs")
    revalidatePath("/pyqs")

    return NextResponse.json({
      success: true,
      affected: result.affected,
      blocked: (result as any).blocked,
      message: `Bulk action "${action}" completed for ${result.affected} paper(s)`,
    })
  } catch (error: any) {
    console.error("POST /api/admin/pyqs/papers/bulk error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process bulk action on papers" },
      { status: 500 }
    )
  }
}
