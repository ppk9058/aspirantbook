import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { setQuestionPublishStatus } from "@/lib/modules/content-engine/db-service"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const json = await req.json()

    let questionIds: string[] = []
    let isPublished = true

    if (Array.isArray(json.questionIds) && json.questionIds.length > 0) {
      questionIds = json.questionIds
      isPublished = json.isPublished !== false
    } else if (json.waveSize && typeof json.waveSize === "number") {
      // Wave publishing: fetch next N draft questions
      const waveSize = Math.min(1000, Math.max(1, json.waveSize))
      const drafts = await prisma.contentEngineQuestion.findMany({
        where: {
          isPublished: false,
          status: "DRAFT",
        },
        take: waveSize,
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })
      questionIds = drafts.map((d) => d.id)
    } else {
      return NextResponse.json(
        { error: "Provide either questionIds (array) or waveSize (number)" },
        { status: 400 }
      )
    }

    if (questionIds.length === 0) {
      return NextResponse.json({
        success: true,
        successCount: 0,
        rejectedCount: 0,
        errors: {},
        message: "No questions selected or available for publishing",
      })
    }

    const result = await setQuestionPublishStatus(questionIds, isPublished)

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/publish error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update question publish status" },
      { status: 500 }
    )
  }
}
