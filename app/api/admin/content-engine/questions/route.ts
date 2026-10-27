import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { getQuestions } from "@/lib/modules/content-engine/db-service"
import { prisma } from "@/lib/prisma"
import { contentEngineQuestionPatchSchema } from "@/lib/validation/admin-payloads"

export async function GET(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get("batchId") || undefined
    const uncategorizedOnly = searchParams.get("uncategorizedOnly") === "true"
    const subject = searchParams.get("subject") || undefined
    const topic = searchParams.get("topic") || undefined
    const exam = searchParams.get("exam") || undefined
    const year = searchParams.get("year") || undefined
    const search = searchParams.get("search") || undefined
    const isPublishedParam = searchParams.get("isPublished")
    const isPublished = isPublishedParam === "true" ? true : isPublishedParam === "false" ? false : undefined
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10)

    const result = await getQuestions({
      batchId,
      uncategorizedOnly,
      subject,
      topic,
      exam,
      year,
      search,
      isPublished,
      page,
      pageSize,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("GET /api/admin/content-engine/questions error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch questions" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const json = await req.json()
    const { id, ...data } = json

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    // A12: only allowlisted question fields may be written. Unknown keys are
    // stripped so the body cannot mass-assign ids, hashes or batch relations.
    const parsed = contentEngineQuestionPatchSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid question payload",
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        { status: 400 }
      )
    }

    const updated = await prisma.contentEngineQuestion.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ success: true, question: updated })
  } catch (error: any) {
    console.error("PATCH /api/admin/content-engine/questions error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update question" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    await prisma.contentEngineQuestion.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("DELETE /api/admin/content-engine/questions error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete question" },
      { status: 500 }
    )
  }
}
