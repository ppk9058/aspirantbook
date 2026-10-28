"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Difficulty } from "@prisma/client"
import { sanitizeHtml } from "@/lib/security/sanitizer"

interface ExerciseInput {
    title: string
    slug: string
    description: string
    language: string
    difficulty: Difficulty
    starterCode: string
    solutionCode: string
    hints: string[]
    lessonId?: string
    testCases?: TestCaseInput[]
}

interface TestCaseInput {
    input: string
    expectedOutput: string
    isHidden: boolean
}

export async function createExercise(data: ExerciseInput) {
    const session = await auth()

    const role = session?.user?.role
    if (!session || (role !== "ADMIN" && role !== "TEACHER")) {
        throw new Error("Unauthorized")
    }

    const { testCases, description, ...exerciseData } = data

    const exercise = await prisma.exercise.create({
        data: {
            ...exerciseData,
            instructions: sanitizeHtml(description), // Map description to sanitized instructions
            testCases: testCases ? {
                create: testCases.map(tc => ({
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isHidden: tc.isHidden,
                })),
            } : undefined,
        },
        include: {
            testCases: true,
        },
    })

    revalidatePath("/admin/exercises")
    return exercise
}

export async function updateExercise(id: string, data: ExerciseInput) {
    const session = await auth()

    const role = session?.user?.role
    if (!session || (role !== "ADMIN" && role !== "TEACHER")) {
        throw new Error("Unauthorized")
    }

    const { testCases, description, ...exerciseData } = data

    // Update exercise details
    const exercise = await prisma.exercise.update({
        where: { id },
        data: {
            ...exerciseData,
            instructions: sanitizeHtml(description), // Map description to sanitized instructions
        },
    })

    // Handle test cases update if provided
    if (testCases) {
        // Delete existing test cases
        await prisma.testCase.deleteMany({
            where: { exerciseId: id },
        })

        // Create new test cases
        await prisma.testCase.createMany({
            data: testCases.map(tc => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden,
                exerciseId: id,
            })),
        })
    }

    revalidatePath("/admin/exercises")
    revalidatePath(`/admin/exercises/${id}/edit`)
    return exercise
}

export async function deleteExercise(id: string) {
    const session = await auth()

    const role = session?.user?.role
    if (!session || (role !== "ADMIN" && role !== "TEACHER")) {
        throw new Error("Unauthorized")
    }

    await prisma.exercise.delete({
        where: { id },
    })

    revalidatePath("/admin/exercises")
}
