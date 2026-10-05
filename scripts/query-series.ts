import { prisma } from "../lib/prisma"

async function main() {
    console.log("=== D: EXAM SERIES RAW DATABASE QUERY ===")

    // Query 1: Series matching created-by-teacher% or %audit%
    const seriesRows = await prisma.examSeries.findMany({
        where: {
            OR: [
                { id: { startsWith: "created-by-teacher" } },
                { id: { contains: "audit" } },
                { slug: { contains: "audit" } },
            ],
        },
        select: {
            id: true,
            slug: true,
            isPublished: true,
            isFree: true,
            isPro: true,
        },
        orderBy: { id: "asc" },
    })

    console.log("\nQuery 1: WHERE id LIKE 'created-by-teacher%' OR id LIKE '%audit%'")
    console.table(seriesRows)

    // Query 2: Counts
    const totalCount = await prisma.examSeries.count()
    const publishedCount = await prisma.examSeries.count({ where: { isPublished: true } })
    const unpublishedCount = await prisma.examSeries.count({ where: { isPublished: false } })

    console.log("\nQuery 2: Total and Published ExamSeries Counts")
    console.table([
        {
            totalSeries: totalCount,
            publishedSeries: publishedCount,
            unpublishedSeries: unpublishedCount,
        },
    ])

    // Query 3: Check /api/exam/series/list visibility of audit series
    console.log("\nQuery 3: Audit series visibility check")
    const auditSeriesInList = await prisma.examSeries.findMany({
        where: {
            isPublished: true,
            OR: [
                { id: { contains: "audit" } },
                { slug: { contains: "audit" } },
            ],
        },
    })
    console.log(`Published audit series found: ${auditSeriesInList.length}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
