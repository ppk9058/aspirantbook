import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import AssessmentResults from "@/components/assessment/AssessmentResults"
import ServiceUnavailable from "@/components/system/ServiceUnavailable"

interface ResultsPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        attemptId?: string
    }>
}

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
    const { id } = await params
    const { attemptId } = await searchParams
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

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
                        _count: {
                            select: {
                                questions: true,
                            },
                        },
                    },
                },
            },
        })
    } catch (error) {
        // Fail closed: never render a fabricated score when the database is unreachable.
        console.error("[assessments/results] Failed to load attempt", error)
        return (
            <ServiceUnavailable
                title="Results temporarily unavailable"
                description="We could not load these results right now. Please try again in a moment."
                homeHref={`/assessments/${id}`}
                homeLabel="Back to assessment"
            />
        )
    }

    if (!attempt || attempt.userId !== session.user.id) {
        notFound()
    }

    const totalQuestions = attempt.assessment?._count?.questions || 0
    const score = attempt.score ?? 0
    const passed = Boolean(attempt.passed)
    const correctAnswers = Math.round((score / 100) * totalQuestions)

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <AssessmentResults
                assessmentId={id}
                attemptId={attemptId}
                score={score}
                passed={passed}
                timeSpent={attempt.timeSpent || 60}
                xpEarned={passed ? correctAnswers * 20 : 10}
                totalQuestions={totalQuestions}
                correctAnswers={correctAnswers}
            />
        </div>
    )
}
