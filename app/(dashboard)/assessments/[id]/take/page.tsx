import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AssessmentInterface from "@/components/assessment/AssessmentInterface"
import { FIVE_STANDARD_QUESTIONS } from "@/lib/assessments-data"

interface TakeAssessmentPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        attemptId?: string
    }>
}

export default async function TakeAssessmentPage({ params, searchParams }: TakeAssessmentPageProps) {
    const { id } = await params
    const { attemptId: rawAttemptId } = await searchParams
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const effectiveAttemptId = rawAttemptId || `attempt-${Date.now()}`

    let attempt: any = null

    if (rawAttemptId && rawAttemptId !== "mock-attempt-id" && !rawAttemptId.startsWith("mock-")) {
        try {
            attempt = await prisma.assessmentAttempt.findUnique({
                where: { id: rawAttemptId },
                include: {
                    assessment: {
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
                    },
                },
            })
        } catch {
            console.warn("Database offline on /assessments/[id]/take, using curated questions.")
        }
    }

    // Curated 5-question fallback
    if (!attempt) {
        attempt = {
            id: effectiveAttemptId,
            userId: session.user.id,
            assessmentId: id,
            startedAt: new Date(),
            completedAt: null,
            assessment: {
                duration: 15,
                questions: FIVE_STANDARD_QUESTIONS,
            },
        }
    }

    const questionsToServe =
        attempt.assessment?.questions && attempt.assessment.questions.length > 0
            ? attempt.assessment.questions
            : FIVE_STANDARD_QUESTIONS

    return (
        <AssessmentInterface
            attemptId={effectiveAttemptId}
            assessmentId={id}
            questions={questionsToServe}
            duration={attempt.assessment?.duration || 15}
        />
    )
}
