import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import AssessmentInterface from "@/components/assessment/AssessmentInterface"
import ServiceUnavailable from "@/components/system/ServiceUnavailable"

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
    const { attemptId } = await searchParams
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    // Attempts are only ever created by /api/assessments/[id]/start
    if (!attemptId) {
        redirect(`/assessments/${id}`)
    }

    let attempt: any = null

    try {
        attempt = await prisma.assessmentAttempt.findUnique({
            where: { id: attemptId },
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
    } catch (error) {
        // Fail closed: never serve a fabricated exam when the database is unreachable.
        console.error("[assessments/take] Failed to load attempt", error)
        return (
            <ServiceUnavailable
                title="Assessment temporarily unavailable"
                description="We could not load this attempt right now. Your answers so far are saved - please try again in a moment."
                homeHref={`/assessments/${id}`}
                homeLabel="Back to assessment"
            />
        )
    }

    if (!attempt || attempt.userId !== session.user.id) {
        notFound()
    }

    const questions = attempt.assessment?.questions || []
    if (questions.length === 0) {
        redirect(`/assessments/${id}`)
    }

    return (
        <AssessmentInterface
            attemptId={attempt.id}
            assessmentId={id}
            questions={questions}
            duration={attempt.assessment?.duration || 15}
        />
    )
}
