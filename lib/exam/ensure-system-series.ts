import { prisma } from "@/lib/prisma"

/**
 * Idempotently ensures that the hidden system series 'current-affairs-system-series'
 * exists in the database.
 * Does not mutate or overwrite if already present.
 */
export async function ensureCurrentAffairsSystemSeries() {
    let series = await prisma.examSeries.findFirst({
        where: { slug: "current-affairs-system-series" },
    })

    if (!series) {
        const adminUser = await prisma.user.findFirst({
            where: { role: "ADMIN" },
            select: { id: true },
        })
        const createdById = adminUser?.id || "system-admin"

        series = await prisma.examSeries.create({
            data: {
                title: "Current Affairs Quizzes",
                slug: "current-affairs-system-series",
                examName: "Current Affairs",
                category: "Current Affairs",
                isPublished: false,
                isFree: true,
                createdById,
            },
        })
    }

    return series
}

export async function ensurePyqSystemSeries() {
    let series = await prisma.examSeries.findFirst({
        where: { slug: "pyq-system-series" },
    })

    if (!series) {
        const adminUser = await prisma.user.findFirst({
            where: { role: "ADMIN" },
            select: { id: true },
        })
        const createdById = adminUser?.id || "system-admin"

        series = await prisma.examSeries.create({
            data: {
                title: "Previous Year Questions",
                slug: "pyq-system-series",
                examName: "Previous Year Questions",
                category: "PYQ",
                isPublished: false,
                isFree: true,
                createdById,
            },
        })
    }

    return series
}
