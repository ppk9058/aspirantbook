import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AssessmentForm from "./AssessmentForm"

export default async function CreateAssessmentPage() {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        redirect("/")
    }

    return <AssessmentForm />
}
