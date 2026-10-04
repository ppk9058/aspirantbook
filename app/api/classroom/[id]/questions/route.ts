import { NextResponse } from "next/server"
import { submitQuestion, upvoteQuestion } from "@/lib/classroom-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    if (body.action === "upvote") {
      const updated = await upvoteQuestion(id, body.questionId)
      return NextResponse.json(updated)
    }
    if (!body.question || !body.question.trim()) {
      return NextResponse.json({ error: "Question text is required" }, { status: 400 })
    }
    const created = await submitQuestion(id, {
      userId: body.userId || "student-current",
      userName: body.userName || "Student",
      question: body.question,
    })
    return NextResponse.json(created)
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/questions error:", error)
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 })
  }
}
