import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createQuestionSchema = z.object({
  q: z.string().min(1, "Question text is required"),
  options: z.array(z.string()).min(2, "At least 2 options required"),
  answer: z.string().min(1, "Answer is required"),
  explanation: z.string().optional(),
  sub: z.string().optional(),
  top: z.string().optional(),
  exam: z.string().optional(),
  year: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Admin role required for Content Engine Studio" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get("status")
    const search = searchParams.get("search")

    const where: any = {}
    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam
    }
    if (search) {
      where.OR = [
        { q: { contains: search, mode: "insensitive" } },
        { sub: { contains: search, mode: "insensitive" } },
        { top: { contains: search, mode: "insensitive" } },
        { exam: { contains: search, mode: "insensitive" } },
      ]
    }

    const questions = await prisma.contentEngineQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        shortId: true,
        textHash: true,
        q: true,
        options: true,
        answer: true,
        answerIndex: true,
        explanation: true,
        sub: true,
        top: true,
        exam: true,
        year: true,
        sourceTag: true,
        sourceNo: true,
        status: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        solution: true,
        solutionSource: true,
        _count: {
          select: {
            translations: true,
          },
        },
        override: {
          select: {
            id: true,
            sub: true,
            top: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: questions,
    })
  } catch (error: any) {
    console.error("GET /api/admin/content-engine error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch Content Engine questions" },
      { status: 500 }
    )
  }
}

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
    const parsed = createQuestionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid question payload", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { q, options, answer, explanation, sub, top, exam, year, status } = parsed.data

    const shortId = `ceq-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
    const textHash = `th-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const isPublished = status === "PUBLISHED"

    const question = await prisma.contentEngineQuestion.create({
      data: {
        shortId,
        textHash,
        q,
        options,
        answer,
        explanation: explanation || null,
        sub: sub || null,
        top: top || null,
        exam: exam || null,
        year: year || null,
        status,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
      include: {
        _count: { select: { translations: true } },
        override: { select: { id: true, sub: true, top: true } },
      },
    })

    await writeDualAuditLog({
      actorId: user.userId || "admin",
      action: "CREATE",
      targetId: question.id,
      entityType: "ARTICLE",
      details: { shortId, status, isPublished },
    })

    revalidatePath("/admin/content-engine")

    return NextResponse.json({
      success: true,
      data: question,
      message: "Question created successfully",
    }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create question" },
      { status: 500 }
    )
  }
}
