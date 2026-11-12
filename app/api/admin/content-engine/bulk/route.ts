import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bulkSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "archive", "delete", "restore"]),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Admin role required for Content Engine Studio" },
        { status: 403 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = bulkSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload: questionIds array and valid action required" },
        { status: 400 }
      )
    }

    const { questionIds, action } = parsed.data

    const questions = await prisma.contentEngineQuestion.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, status: true, isPublished: true },
    })

    if (questions.length === 0) {
      return NextResponse.json({ success: true, affected: 0, message: "No matching questions" })
    }

    const matchingIds = questions.map((q) => q.id)

    if (action === "publish") {
      const res = await prisma.contentEngineQuestion.updateMany({
        where: { id: { in: matchingIds } },
        data: {
          status: "PUBLISHED",
          isPublished: true,
          publishedAt: new Date(),
        },
      })

      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "BULK_PUBLISH",
        targetId: "bulk-content-engine",
        entityType: "ARTICLE",
        details: { count: res.count },
      })

      revalidatePath("/admin/content-engine")
      return NextResponse.json({ success: true, affected: res.count })
    }

    if (action === "archive") {
      const res = await prisma.contentEngineQuestion.updateMany({
        where: { id: { in: matchingIds } },
        data: {
          status: "ARCHIVED",
          isPublished: false,
        },
      })

      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "BULK_ARCHIVE",
        targetId: "bulk-content-engine",
        entityType: "ARTICLE",
        details: { count: res.count },
      })

      revalidatePath("/admin/content-engine")
      return NextResponse.json({ success: true, affected: res.count })
    }

    if (action === "restore") {
      const res = await prisma.contentEngineQuestion.updateMany({
        where: { id: { in: matchingIds } },
        data: {
          status: "DRAFT",
          isPublished: false,
        },
      })

      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "BULK_RESTORE",
        targetId: "bulk-content-engine",
        entityType: "ARTICLE",
        details: { count: res.count },
      })

      revalidatePath("/admin/content-engine")
      return NextResponse.json({ success: true, affected: res.count })
    }

    if (action === "delete") {
      // Hard delete allowed only for DRAFT or ARCHIVED questions, refused for PUBLISHED
      const deletable = questions.filter(
        (q) => q.status !== "PUBLISHED" && !q.isPublished
      )
      const deletableIds = deletable.map((q) => q.id)
      const blockedCount = questions.length - deletable.length

      if (deletableIds.length === 0) {
        return NextResponse.json(
          {
            error: "Cannot delete questions: all selected questions are PUBLISHED. Archive instead.",
            status: 409,
            affected: 0,
            blocked: blockedCount,
          },
          { status: 409 }
        )
      }

      const res = await prisma.contentEngineQuestion.deleteMany({
        where: { id: { in: deletableIds } },
      })

      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "BULK_DELETE",
        targetId: "bulk-content-engine",
        entityType: "ARTICLE",
        details: { affected: res.count, blocked: blockedCount },
      })

      revalidatePath("/admin/content-engine")

      return NextResponse.json({
        success: true,
        affected: res.count,
        blocked: blockedCount,
        message: `Deleted ${res.count} question(s)${blockedCount > 0 ? ` (${blockedCount} published questions blocked)` : ""}`,
      })
    }

    return NextResponse.json({ success: true, affected: 0 })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/bulk error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process bulk action on questions" },
      { status: 500 }
    )
  }
}
