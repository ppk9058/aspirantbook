import { prisma } from "@/lib/prisma"

/**
 * Derives a clean, SEO-friendly slug from a Current Affairs quiz title.
 * E.g. "UPSC Economy CA" -> "upsc-economy-ca"
 */
export function getQuizSlug(quiz: { id: string; title: string }): string {
    if (!quiz || !quiz.title) return quiz?.id || ""
    const clean = quiz.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    return clean || quiz.id
}

/**
 * Resolves a quiz either by its direct ID or by its derived slug.
 */
export async function findQuizBySlug(slug: string) {
    if (!slug) return null

    // 1. Direct ID lookup
    const byId = await prisma.examTest.findFirst({
        where: {
            id: slug,
            testType: "CURRENT_AFFAIRS",
        },
        include: {
            series: true,
            sections: {
                include: {
                    questions: true,
                },
            },
        },
    })
    if (byId) return byId

    // 2. Slug match across Current Affairs quizzes
    const allCaTests = await prisma.examTest.findMany({
        where: {
            testType: "CURRENT_AFFAIRS",
        },
        include: {
            series: true,
            sections: {
                include: {
                    questions: true,
                },
            },
        },
    })

    const matched = allCaTests.find((t) => getQuizSlug(t) === slug)
    return matched || null
}
