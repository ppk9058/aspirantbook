import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { bulkManageBooks } from "@/lib/books/bookService"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"

const bulkSchema = z.object({
  bookIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "unpublish", "archive", "restore", "delete", "reject"]),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can perform bulk actions on books" },
        { status: 403 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = bulkSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload: bookIds array and valid action required" },
        { status: 400 }
      )
    }

    const { bookIds, action } = parsed.data

    if ((action === "publish" || action === "reject") && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can approve or reject books" },
        { status: 403 }
      )
    }

    const result = await bulkManageBooks({
      bookIds,
      action,
      userId: user.userId || "",
      role: user.role,
    })

    await writeDualAuditLog({
      actorId: user.userId || "unknown",
      action: `BULK_${action.toUpperCase()}`,
      targetId: "bulk-books",
      entityType: "ARTICLE",
      details: {
        action,
        requestedCount: bookIds.length,
        affected: result.affected,
        blocked: result.blocked,
      },
    })

    revalidatePath("/admin/books")
    revalidatePath("/admin/book-studio")
    revalidatePath("/books")

    return NextResponse.json({
      success: true,
      affected: result.affected,
      blocked: result.blocked,
      message: `Bulk action "${action}" completed for ${result.affected} book(s)`,
    })
  } catch (error: any) {
    console.error("POST /api/books/bulk error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process bulk action on books" },
      { status: 500 }
    )
  }
}
