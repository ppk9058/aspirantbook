import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { FIVE_STANDARD_QUESTIONS } from "@/lib/assessments-data"

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await auth()

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const assessment = await prisma.assessment.findUnique({
            where: { id: id },
            include: {
                questions: {
                    select: {
                        id: true,
                        type: true,
                        question: true,
                        options: true,
                        points: true,
                        order: true,
                    },
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        })

        if (!assessment) {
            // Curated 5-question mock attempt
            const attemptId = "attempt-" + Date.now()
            const now = new Date()
            return NextResponse.json({
                attemptId,
                questions: FIVE_STANDARD_QUESTIONS,
                startTime: now,
                endTime: new Date(now.getTime() + 15 * 60 * 1000),
                duration: 15,
            })
        }

        // Create new attempt in DB
        const attempt = await prisma.assessmentAttempt.create({
            data: {
                userId: session.user.id,
                assessmentId: id,
                answers: {},
                score: 0,
                passed: false,
            },
        })

        const endTime = new Date(Date.now() + (assessment.duration || 15) * 60 * 1000)

        return NextResponse.json({
            attemptId: attempt.id,
            questions: assessment.questions && assessment.questions.length > 0 ? assessment.questions : FIVE_STANDARD_QUESTIONS,
            startTime: attempt.startedAt,
            endTime,
            duration: assessment.duration || 15,
        })
    } catch {
        console.warn("Database offline in assessment start API, serving curated 5 questions.")
        const now = new Date()
        return NextResponse.json({
            attemptId: "attempt-" + Date.now(),
            questions: FIVE_STANDARD_QUESTIONS,
            startTime: now,
            endTime: new Date(now.getTime() + 15 * 60 * 1000),
            duration: 15,
        })
    }
}
