import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AssessmentResults from "@/components/assessment/AssessmentResults"

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

    if (!session) {
        redirect("/login")
    }

    if (!attemptId) {
        redirect(`/assessments/${id}`)
    }

    let attempt: any = null

    if (attemptId !== "mock-attempt-id" && !attemptId.startsWith("mock-")) {
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
        } catch {
            console.warn("Database offline on /assessments/[id]/results, relying on client attempt state.")
        }
    }

    // Dynamic initial fallback (enhanced by localStorage in AssessmentResults component)
    if (!attempt) {
        attempt = {
            id: attemptId,
            score: 0,
            passed: false,
            timeSpent: 60,
            assessmentId: id,
            assessment: {
                _count: {
                    questions: 5,
                },
                passingScore: 60,
            },
        }
    }

    const totalQuestions = attempt.assessment?._count?.questions || 5
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
