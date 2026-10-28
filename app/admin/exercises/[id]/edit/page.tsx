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

    return (
        <ExerciseForm
            initialData={{
                id: exercise.id,
                title: exercise.title,
                slug: exercise.slug,
                // B-014: the column is `instructions`; the form/action speak
                // `description`. Without this mapping the edit form loaded an
                // empty description and saving overwrote the instructions.
                description: exercise.instructions,
                language: exercise.language,
                difficulty: exercise.difficulty,
                starterCode: exercise.starterCode,
                solution: exercise.solution,
                hints: exercise.hints,
                lessonId: exercise.lessonId,
                testCases: exercise.testCases.map((tc) => ({
                    id: tc.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isHidden: tc.isHidden,
                })),
            }}
            lessons={lessons}
        />
    )
}
