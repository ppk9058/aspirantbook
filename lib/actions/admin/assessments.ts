"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Difficulty, QuestionType } from "@prisma/client"

interface AssessmentInput {
    title: string
    slug: string
    description?: string
    technology: string
    difficulty: Difficulty
    duration: number
    passingScore: number
    questions?: QuestionInput[]
}

interface QuestionInput {
    type: QuestionType
    question: string
    options?: string[]
    correctAnswer: string
    explanation?: string
    points: number
    order: number
}

export async function createAssessment(data: AssessmentInput, publish = false) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { questions, ...assessmentData } = data

    const assessment = await prisma.assessment.create({
        data: {
            ...assessmentData,
            isPublished: publish,
            questions: questions ? {
                create: questions,
            } : undefined,
        },
        include: {
            questions: true,
        },
    })

    revalidatePath("/admin/assessments")
    return assessment
}

export async function updateAssessment(id: string, data: AssessmentInput) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { questions, ...assessmentData } = data

    const assessment = await prisma.assessment.update({
        where: { id },
        data: assessmentData,
    })

    revalidatePath("/admin/assessments")
    revalidatePath(`/admin/assessments/${id}/edit`)
    return assessment
}

export async function togglePublishAssessment(id: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const assessment = await prisma.assessment.findUnique({
        where: { id },
        select: { isPublished: true },
    })

    if (!assessment) {
        throw new Error("Assessment not found")
    }

    const updated = await prisma.assessment.update({
        where: { id },
        data: {
            isPublished: !assessment.isPublished,
        },
    })

    revalidatePath("/admin/assessments")
    revalidatePath(`/admin/assessments/${id}/edit`)
    revalidatePath("/assessments") // Student view
    return updated
}

export async function deleteAssessment(id: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    await prisma.assessment.delete({
        where: { id },
    })

    revalidatePath("/admin/assessments")
}

export async function addQuestion(assessmentId: string, question: QuestionInput) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const newQuestion = await prisma.question.create({
        data: {
            ...question,
            assessmentId,
        },
    })

    revalidatePath(`/admin/assessments/${assessmentId}/edit`)
    return newQuestion
}

export async function updateQuestion(questionId: string, data: Partial<QuestionInput>) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const question = await prisma.question.update({
        where: { id: questionId },
        data,
    })

    revalidatePath(`/admin/assessments/${question.assessmentId}/edit`)
    return question
}

export async function deleteQuestion(questionId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: { assessmentId: true },
    })

    if (!question) {
        throw new Error("Question not found")
    }

    await prisma.question.delete({
        where: { id: questionId },
    })

    revalidatePath(`/admin/assessments/${question.assessmentId}/edit`)
}

export async function reorderQuestions(assessmentId: string, questionIds: string[]) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Update order for each question
    await Promise.all(
        questionIds.map((id, index) =>
            prisma.question.update({
                where: { id },
                data: { order: index + 1 },
            })
        )
    )

    revalidatePath(`/admin/assessments/${assessmentId}/edit`)
}
