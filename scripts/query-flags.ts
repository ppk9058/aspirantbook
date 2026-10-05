import { prisma } from "../lib/prisma"

function maskId(id: string) {
    return id.length > 8 ? id.slice(0, 8) + "..." : id
}

async function main() {
    const seriesList = await prisma.examSeries.findMany({
        where: {
            OR: [
                { id: { in: ["bpsc-72nd-2026", "upsc-prelims-2026"] } },
                { slug: { in: ["bpsc-72nd-2026", "upsc-prelims-2026"] } },
            ],
        },
        select: {
            id: true,
            slug: true,
            isFree: true,
            isPro: true,
            isPublished: true,
            updatedAt: true,
        },
    })

    const courseList = await prisma.course.findMany({
        where: {
            OR: [
                { id: { in: ["72nd-bpsc-prelims-current-affairs", "3", "generative-ai", "ai-course-test", "ai-course"] } },
                { slug: { in: ["72nd-bpsc-prelims-current-affairs", "3", "generative-ai", "ai-course-test", "ai-course"] } },
            ],
        },
        select: {
            id: true,
            slug: true,
            isPremium: true,
            price: true,
            status: true,
            updatedAt: true,
        },
    })

    console.log("=== EXAM SERIES FLAGS ===")
    console.table(
        seriesList.map((s) => ({
            id: maskId(s.id),
            slug: s.slug,
            isFree: s.isFree,
            isPro: s.isPro,
            isPublished: s.isPublished,
            updatedAt: s.updatedAt.toISOString(),
        }))
    )

    console.log("=== COURSE FLAGS ===")
    console.table(
        courseList.map((c) => ({
            id: maskId(c.id),
            slug: c.slug,
            isPremium: c.isPremium,
            price: c.price,
            status: c.status,
            updatedAt: c.updatedAt.toISOString(),
        }))
    )
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
