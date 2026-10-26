import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { evaluateAssessment, type AssessmentQuestion } from "@/lib/assessments-data"

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ attemptId: string }> }
) {
    try {
        const { attemptId } = await params
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { answers = {} } = await req.json()

        const attempt = await prisma.assessmentAttempt.findUnique({
            where: { id: attemptId },
            include: {
                assessment: {
                    include: {
                        questions: true,
                    },
                },
            },
        })

        if (!attempt) {
            return NextResponse.json({ error: "Attempt not found" }, { status: 404 })
        }

        if (attempt.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const storedQuestions = attempt.assessment?.questions
        if (!storedQuestions || storedQuestions.length === 0) {
            return NextResponse.json(
                { error: "This attempt has no questions to grade" },
                { status: 409 }
            )
        }

        // Normalise Prisma JSON/enum columns into the grading shape.
        const questions: AssessmentQuestion[] = storedQuestions.map((q) => ({
            id: q.id,
            type: q.type as AssessmentQuestion["type"],
            question: q.question,
            options: Array.isArray(q.options) ? (q.options as string[]) : [],
            correctAnswer: q.correctAnswer,
            points: q.points,
            order: q.order,
            explanation: q.explanation ?? "",
        }))

        const evaluation = evaluateAssessment(
            answers,
            questions,
            attempt.assessment?.passingScore || 60
        )

        const timeSpent = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
        await prisma.assessmentAttempt.update({
            where: { id: attemptId },
            data: {
                answers,
                score: evaluation.score,
                passed: evaluation.passed,
                timeSpent,
                completedAt: new Date(),
            },
        })

        if (evaluation.passed) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    xp: {
                        increment: evaluation.correctAnswers * 20,
                    },
                },
            })
        }

        return NextResponse.json({
            success: true,
            score: evaluation.score,
            passed: evaluation.passed,
            correctAnswers: evaluation.correctAnswers,
            totalQuestions: evaluation.totalQuestions,
            breakdown: evaluation.breakdown,
            assessmentId: attempt.assessmentId,
        })
    } catch (error) {
        // Fail closed: never return a fabricated score when the database is unreachable.
        console.error("[assessments/submit] Failed to grade assessment attempt", error)
        return NextResponse.json(
            { error: "Assessment submission is temporarily unavailable" },
            { status: 503 }
        )
    }
}
