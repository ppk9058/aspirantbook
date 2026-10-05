import { prisma } from "../lib/prisma"

async function main() {
    console.log("=== COURSE FLAGS (REAL COLUMNS ONLY) ===")
    const targetCourses = [
        "72nd-bpsc-prelims-current-affairs",
        "3",
        "generative-ai",
        "ai-course-test",
        "ai-course",
    ]

    const courses = await prisma.course.findMany({
        where: { slug: { in: targetCourses } },
        select: {
            id: true,
            slug: true,
            isPremium: true,
            price: true,
            status: true,
        },
    })

    const courseTable = courses.map((c) => ({
        id: c.id.slice(0, 8),
        slug: c.slug,
        isPremium: c.isPremium,
        price: c.price,
        status: c.status,
    }))
    console.table(courseTable)

    console.log("\n=== EXAM SERIES FLAGS (REAL COLUMNS ONLY) ===")
    const targetSeries = ["bpsc-72nd-2026", "upsc-prelims-2026"]
    const series = await prisma.examSeries.findMany({
        where: { slug: { in: targetSeries } },
        select: {
            id: true,
            slug: true,
            isFree: true,
            isPro: true,
            isPublished: true,
        },
    })

    const seriesTable = series.map((s) => ({
        id: s.id.slice(0, 8),
        slug: s.slug,
        isFree: s.isFree,
        isPro: s.isPro,
        isPublished: s.isPublished,
    }))
    console.table(seriesTable)
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
