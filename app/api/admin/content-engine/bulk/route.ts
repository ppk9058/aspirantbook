import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bulkSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["publish", "archive", "delete", "restore", "approve"]),
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
      select: { id: true, status: true, isPublished: true, solution: true },
    })

    if (questions.length === 0) {
      return NextResponse.json({ success: true, affected: 0, message: "No matching questions" })
    }

    const matchingIds = questions.map((q) => q.id)

    /** Structured-solution gate (Phase 2.7): a question WITH a structured
     * solution can publish only when that solution is APPROVED (auto-blocks
     * answer-mismatch, CHECK disagree/unsure etc.). Legacy rows without a
     * structured solution publish as before. */
    interface SolGate {
      status?: string
      warnings?: string[]
    }
    const publishBlocked = questions
      .filter((q) => {
        const sol = (q.solution || null) as SolGate | null
        return sol && sol.status !== "APPROVED"
      })
      .map((q) => {
        const sol = (q.solution || null) as SolGate | null
        return { id: q.id, reason: sol?.status === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "solution-not-approved" }
      })

    if (action === "publish") {
      if (publishBlocked.length === questions.length) {
        return NextResponse.json(
          {
            error: "Publish blocked: structured solutions must be APPROVED first",
            blocked: publishBlocked,
          },
          { status: 409 },
        )
      }
      const publishableIds = matchingIds.filter(
        (id) => !publishBlocked.some((b) => b.id === id),
      )
      const res = await prisma.contentEngineQuestion.updateMany({
        where: { id: { in: publishableIds } },
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
        details: { count: res.count, blocked: publishBlocked.length },
      })

      revalidatePath("/admin/content-engine")
      return NextResponse.json({
        success: true,
        affected: res.count,
        blocked: publishBlocked.length ? publishBlocked : undefined,
      })
    }

    if (action === "approve") {
      // Bulk approve guard (Phase 2.7): only CHECK=agree, UNSURE empty and no
      // warnings. Failing rows are skipped with reasons, never crash the batch.
      const approvedIds: string[] = []
      const skipped: { id: string; reason: string }[] = []
      for (const q of questions) {
        const sol = (q.solution || null) as SolGate | null
        if (!sol) {
          skipped.push({ id: q.id, reason: "no structured solution" })
          continue
        }
        const check = (sol as { check?: string }).check
        const unsure = (sol as { unsure?: string | null }).unsure
        const warnings = (sol as { warnings?: string[] }).warnings || []
        if (check !== "agree") {
          skipped.push({ id: q.id, reason: `CHECK is ${check || "missing"}` })
          continue
        }
        if (unsure) {
          skipped.push({ id: q.id, reason: "UNSURE is set" })
          continue
        }
        if (warnings.length > 0) {
          skipped.push({ id: q.id, reason: `warnings: ${warnings.join(", ")}` })
          continue
        }
        approvedIds.push(q.id)
      }
      let affected = 0
      if (approvedIds.length > 0) {
        const rows = await prisma.contentEngineQuestion.findMany({
          where: { id: { in: approvedIds } },
          select: { id: true, solution: true },
        })
        await prisma.$transaction(
          rows.map((row) => {
            const sol = (row.solution || {}) as SolGate
            return prisma.contentEngineQuestion.update({
              where: { id: row.id },
              data: {
                solution: { ...sol, status: "APPROVED" } as unknown as Prisma.InputJsonValue,
              },
            })
          }),
        )
        affected = rows.length
      }
      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "BULK_APPROVE",
        targetId: "bulk-content-engine",
        entityType: "ARTICLE",
        details: { approved: affected, skipped: skipped.length },
      })
      revalidatePath("/admin/content-engine")
      if (affected === 0) {
        return NextResponse.json(
          { success: false, affected: 0, skipped, error: "No question passed the approve guard" },
          { status: 409 },
        )
      }
      return NextResponse.json({ success: true, affected, skipped })
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
