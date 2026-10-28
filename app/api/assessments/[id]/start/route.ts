import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await auth()

        if (!session?.user?.id) {
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
            return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
        }

        if (!assessment.questions || assessment.questions.length === 0) {
            return NextResponse.json(
                { error: "This assessment does not have any questions yet" },
                { status: 409 }
            )
        }

        // Create new attempt in DB
        const attempt = await prisma.assessmentAttempt.create({
            data: {
                userId: session.user.id,
                assessmentId: id,
                answers: {},
                score: 0,
                passed: false,
                timeSpent: 0,
            },
        })

        const endTime = new Date(Date.now() + (assessment.duration || 15) * 60 * 1000)

        return NextResponse.json({
            attemptId: attempt.id,
            questions: assessment.questions,
            startTime: attempt.startedAt,
            endTime,
            duration: assessment.duration || 15,
        })
    } catch (error) {
        // Fail closed: never serve a fabricated exam when the database is unreachable.
        console.error("[assessments/start] Failed to start assessment", error)
        return NextResponse.json(
            { error: "Assessment service is temporarily unavailable" },
            { status: 503 }
        )
    }
}
