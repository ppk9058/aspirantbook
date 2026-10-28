import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext, requirePermission } from "@/lib/auth/rbac"
import { getAllDoubts, createDoubt, answerDoubt, upvoteDoubt } from "@/lib/doubts-service"
import { logAuditEvent } from "@/lib/audit/audit-logger"
import { StudentDoubtSolver } from "@/lib/ai/student/doubt-solver"

export async function GET(request: NextRequest) {
  try {
    const userContext = await getCurrentUserContext()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as "PENDING" | "ANSWERED" | undefined
    const subject = searchParams.get("subject") || undefined
    const filterStudent = searchParams.get("myOnly") === "true"

    const doubts = await getAllDoubts({
      studentId: filterStudent && userContext.role === "STUDENT" ? userContext.userId : undefined,
      status: status || undefined,
      subject: subject || undefined,
    })

    return NextResponse.json({ success: true, doubts })
  } catch (error: any) {
    console.error("GET /api/doubts error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch doubts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userContext = await requirePermission("question.create")
    const body = await request.json()

    const { subject, topic, questionText, attachment, requestAiSolution } = body
    if (!subject || !questionText) {
      return NextResponse.json(
        { error: "Subject and question text are required." },
        { status: 400 }
      )
    }

    let aiSolution: any = null
    let aiFallback: string | undefined = undefined

    // Optional student AI doubt solving (protected by quota, length limits, and kill switch)
    if (requestAiSolution) {
      const aiResult = await StudentDoubtSolver.solve({
        userId: userContext.userId || "anonymous-student",
        subject,
        topic,
        questionText,
      })

      if (aiResult.solvedByAi) {
        aiSolution = aiResult
      } else {
        aiFallback = aiResult.message
      }
    }

    const newDoubt = await createDoubt({
      studentId: userContext.userId || "anonymous-student",
      studentName: userContext.name || "Student Learner",
      studentEmail: userContext.email || undefined,
      subject,
      topic,
      questionText,
      attachment,
    })

    if (aiSolution) {
      await answerDoubt(
        newDoubt.id,
        "AI Mentor (Draft Preview)",
        aiSolution.answer
      )
    }

    await logAuditEvent({
      userId: userContext.userId || "student",
      userName: userContext.name || "Student Learner",
      userRole: userContext.role,
      action: "question.ask",
      target: newDoubt.id,
      details: { subject, topic, hasAttachment: !!attachment, aiAssisted: !!aiSolution },
    })

    return NextResponse.json(
      {
        success: true,
        doubt: newDoubt,
        aiSolution,
        aiFallback,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("POST /api/doubts error:", error)
    const isUnauth = error.message?.includes("UNAUTHORIZED")
    return NextResponse.json(
      { error: error.message || "Failed to create doubt" },
      { status: isUnauth ? 401 : 403 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userContext = await getCurrentUserContext()
    const body = await request.json()
    const { id, action, answerText } = body

    if (!id) {
      return NextResponse.json({ error: "Doubt ID is required." }, { status: 400 })
    }

    if (action === "upvote") {
      const updated = await upvoteDoubt(id)
      return NextResponse.json({ success: true, doubt: updated })
    }

    if (action === "answer") {
      await requirePermission("question.answer")
      if (!answerText || !answerText.trim()) {
        return NextResponse.json({ error: "Answer text is required." }, { status: 400 })
      }

      const updated = await answerDoubt(
        id,
        userContext.name || "Faculty Mentor",
        answerText.trim()
      )

      await logAuditEvent({
        userId: userContext.userId || "teacher",
        userName: userContext.name || "Faculty Mentor",
        userRole: userContext.role,
        action: "question.answer",
        target: id,
        details: { teacherName: userContext.name },
      })

      return NextResponse.json({ success: true, doubt: updated })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("PATCH /api/doubts error:", error)
    return NextResponse.json({ error: error.message || "Failed to process doubt action" }, { status: 403 })
  }
}
