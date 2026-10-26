import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import AssessmentOverview from "@/components/assessment/AssessmentOverview"
import ServiceUnavailable from "@/components/system/ServiceUnavailable"

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
    } catch (error) {
        // Fail closed: never render a curated mock assessment when the database is unreachable.
        console.error("[assessments] Failed to load assessment", error)
        return (
            <ServiceUnavailable
                title="Assessment temporarily unavailable"
                description="We could not load this assessment right now. Please try again in a moment."
                homeHref="/assessments"
                homeLabel="Back to assessments"
            />
        )
    }

    if (!assessment) {
        notFound()
    }

    return <AssessmentOverview assessment={assessment} userId={session.user.id} />
}
