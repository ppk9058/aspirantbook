import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import ExerciseForm from "../../create/ExerciseForm"

import { getCurrentUserContext } from "@/lib/auth/rbac"

interface EditExercisePageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditExercisePage({ params }: EditExercisePageProps) {
    const { id } = await params
    const user = await getCurrentUserContext()

    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
        redirect("/")
    }

    const exercise = await prisma.exercise.findUnique({
        where: { id: id },
        include: {
            testCases: true,
        },
    })

    if (!exercise) {
        notFound()
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

    return <ExerciseForm initialData={exercise} lessons={lessons} />
}
