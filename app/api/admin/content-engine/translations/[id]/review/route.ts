import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface TranslationSolution {
  status?: string
  warnings?: string[]
}

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
})

/**
 * POST /api/admin/content-engine/translations/[id]/review
 * approve -> isReviewed=true, solution.status=APPROVED
 * reject  -> stays unreviewed with a visible "rejected" warning.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUserContext()
  if (!user.isAuthenticated || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Access Denied: Admin role required for Content Engine Studio" },
      { status: 403 },
    )
  }
  try {
    const { id } = await params
    const parsed = reviewSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review payload" }, { status: 400 })
    }
    const { action } = parsed.data

    const translation = await prisma.contentEngineTranslation.findUnique({
      where: { id },
      select: { id: true, lang: true, isReviewed: true, solution: true, questionId: true },
    })
    if (!translation || translation.lang !== "hi") {
      return NextResponse.json({ error: "Hindi translation not found" }, { status: 404 })
    }

    const sol = (translation.solution || {}) as TranslationSolution
    const nextSolution: TranslationSolution = { ...sol }

    if (action === "approve") {
      nextSolution.status = "APPROVED"
      await prisma.contentEngineTranslation.update({
        where: { id },
        data: {
          isReviewed: true,
          reviewedById: user.userId || null,
          reviewedAt: new Date(),
          solution: nextSolution as unknown as Prisma.InputJsonValue,
        },
      })
    } else {
      nextSolution.status = "NEEDS_REVIEW"
      nextSolution.warnings = Array.from(new Set([...(sol.warnings || []), "rejected"]))
      await prisma.contentEngineTranslation.update({
        where: { id },
        data: {
          isReviewed: false,
          solution: nextSolution as unknown as Prisma.InputJsonValue,
        },
      })
    }

    await writeDualAuditLog({
      actorId: user.userId || "admin",
      action: "UPDATE",
      targetId: id,
      entityType: "ARTICLE",
      details: { translation: "hi", review: action },
    })
    revalidatePath("/admin/content-engine")
    return NextResponse.json({
      success: true,
      isReviewed: action === "approve",
      solutionStatus: nextSolution.status,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Translation review failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
