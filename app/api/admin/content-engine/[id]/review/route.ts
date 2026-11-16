import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface SolutionJson {
  keyPoints?: string[]
  additionalInfo?: { heading: string; points: { text: string; sub: string[] }[] }[]
  optionAnalysis?: { letter: string; verdict: string; reason: string }[]
  memoryTip?: string | null
  concepts?: string[]
  check?: string | null
  checkNote?: string | null
  unsure?: string | null
  status?: string
  warnings?: string[]
  hints?: { subject: string | null; topic: string | null }
}

const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "save"]),
  edits: z
    .object({
      q: z.string().min(1).optional(),
      options: z.array(z.string().min(1)).min(2).max(5).optional(),
      answer: z.string().regex(/^[A-E]$/).optional(),
      answerIndex: z.number().int().min(1).max(5).optional(),
      sub: z.string().nullable().optional(),
      top: z.string().nullable().optional(),
      exam: z.string().nullable().optional(),
      year: z.string().nullable().optional(),
      check: z.enum(["agree", "disagree", "unsure"]).optional(),
      checkNote: z.string().nullable().optional(),
      unsure: z.string().nullable().optional(),
    })
    .default({}),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Admin role required for Content Engine Studio" },
        { status: 403 },
      )
    }
    const { id } = await params
    const rawBody = await req.json().catch(() => null)
    const parsed = reviewSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review payload", issues: parsed.error.issues }, { status: 400 })
    }
    const { action, edits } = parsed.data

    const question = await prisma.contentEngineQuestion.findUnique({
      where: { id },
      select: { id: true, shortId: true, q: true, options: true, answer: true, answerIndex: true, sub: true, top: true, solution: true, status: true },
    })
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }
    const solution = (question.solution || null) as SolutionJson | null
    if (!solution) {
      return NextResponse.json(
        { error: "This question has no structured solution to review" },
        { status: 409 },
      )
    }

    // Apply inline edits (question fields + solution review fields).
    let nextSolution: SolutionJson = { ...solution }
    const questionData: Record<string, unknown> = {}
    if (edits.q !== undefined) questionData.q = edits.q
    if (edits.options !== undefined) questionData.options = edits.options
    if (edits.answer !== undefined) questionData.answer = edits.answer
    if (edits.answerIndex !== undefined) questionData.answerIndex = edits.answerIndex
    if (edits.sub !== undefined || edits.top !== undefined) {
      questionData.sub = edits.sub !== undefined ? edits.sub : question.sub ?? null
      questionData.top = edits.top !== undefined ? edits.top : question.top ?? null
    }
    if (edits.exam !== undefined) questionData.exam = edits.exam
    if (edits.year !== undefined) questionData.year = edits.year
    if (edits.check !== undefined) nextSolution.check = edits.check
    if (edits.checkNote !== undefined) nextSolution.checkNote = edits.checkNote
    if (edits.unsure !== undefined) nextSolution.unsure = edits.unsure

    if (action === "save") {
      questionData.solution = nextSolution
      const updated = await prisma.contentEngineQuestion.update({
        where: { id },
        data: questionData as Prisma.ContentEngineQuestionUpdateInput,
      })
      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "UPDATE",
        targetId: id,
        entityType: "ARTICLE",
        details: { shortId: question.shortId, reviewEdit: true },
      })
      revalidatePath("/admin/content-engine")
      return NextResponse.json({ success: true, question: { id: updated.id, status: updated.status } })
    }

    if (action === "approve") {
      // Same guard as bulk approve: CHECK=agree, UNSURE empty, no warnings.
      const reasons: string[] = []
      if ((nextSolution.check || null) !== "agree") reasons.push(`CHECK is ${nextSolution.check || "missing"}`)
      if (nextSolution.unsure) reasons.push("UNSURE is set")
      if ((nextSolution.warnings || []).length > 0) reasons.push(`warnings: ${(nextSolution.warnings || []).join(", ")}`)
      if (reasons.length > 0) {
        return NextResponse.json({ error: "Approve guard failed", reasons }, { status: 409 })
      }
      nextSolution.status = "APPROVED"
      questionData.solution = nextSolution
      await prisma.contentEngineQuestion.update({ where: { id }, data: questionData as Prisma.ContentEngineQuestionUpdateInput })
      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "UPDATE",
        targetId: id,
        entityType: "ARTICLE",
        details: { shortId: question.shortId, review: "APPROVED" },
      })
      revalidatePath("/admin/content-engine")
      return NextResponse.json({ success: true, solutionStatus: "APPROVED" })
    }

    // reject → stays in the review queue with a visible rejected marker.
    nextSolution.status = "NEEDS_REVIEW"
    nextSolution.warnings = Array.from(new Set([...(nextSolution.warnings || []), "rejected"]))
    questionData.solution = nextSolution
    await prisma.contentEngineQuestion.update({ where: { id }, data: questionData as Prisma.ContentEngineQuestionUpdateInput })
    await writeDualAuditLog({
      actorId: user.userId || "admin",
      action: "UPDATE",
      targetId: id,
      entityType: "ARTICLE",
      details: { shortId: question.shortId, review: "REJECTED" },
    })
    revalidatePath("/admin/content-engine")
    return NextResponse.json({ success: true, solutionStatus: "NEEDS_REVIEW", rejected: true })
  } catch (err) {
    return NextResponse.json(
      { error: "Review action failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
