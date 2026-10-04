import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import AssessmentOverview from "@/components/assessment/AssessmentOverview"
import { getCuratedAssessment } from "@/lib/assessments-data"

interface AssessmentPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
    const { id } = await params
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    let assessment: any = null

    try {
        assessment = await prisma.assessment.findUnique({
            where: { id: id },
            include: {
                attempts: {
                    where: {
                        userId: session.user.id,
                    },
                    orderBy: {
                        startedAt: "desc",
                    },
                },
                _count: {
                    select: {
                        questions: true,
                    },
                },
            },
        })
    } catch {
        console.warn("Database offline on /assessments/[id], serving curated assessment.")
    }

    // Curated 5-question fallback
    if (!assessment) {
        assessment = getCuratedAssessment(id)
    }

    if (!assessment) {
        notFound()
    }

    return <AssessmentOverview assessment={assessment} userId={session.user.id} />
}
