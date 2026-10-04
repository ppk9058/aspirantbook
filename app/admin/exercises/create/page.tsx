import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import ExerciseForm from "./ExerciseForm"

export default async function CreateExercisePage() {
    const user = await getCurrentUserContext()

    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
        redirect("/")
    }

    // Fetch lessons for the dropdown
    const lessons = await prisma.lesson.findMany({
        select: {
            id: true,
            title: true,
        },
        orderBy: {
            title: "asc",
        },
    })

    return <ExerciseForm lessons={lessons} />
}
