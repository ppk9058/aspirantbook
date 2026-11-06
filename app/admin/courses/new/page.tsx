import { redirect } from "next/navigation"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { CourseCreationWizard } from "@/components/admin/courses/CourseCreationWizard"

export const dynamic = "force-dynamic"

export default async function NewVideoCoursePage() {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
        redirect("/")
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
            <CourseCreationWizard />
        </div>
    )
}
