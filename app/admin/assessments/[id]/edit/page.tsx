import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import AssessmentForm from "../../create/AssessmentForm"

interface EditAssessmentPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditAssessmentPage({ params }: EditAssessmentPageProps) {
    const { id } = await params
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        redirect("/")
    }

    const assessment = await prisma.assessment.findUnique({
        where: { id: id },
        include: {
            questions: {
                orderBy: {
                    order: "asc",
                },
            },
        },
    })

    if (!assessment) {
        notFound()
    }

    return <AssessmentForm initialData={assessment} />
}
