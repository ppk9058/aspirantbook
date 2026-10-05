import { prisma } from "../lib/prisma"

async function main() {
    console.log("=== EXAM SERIES INVENTORY ===")
    const series = await prisma.examSeries.findMany({
        select: {
            id: true,
            slug: true,
            title: true,
            isPublished: true,
            createdAt: true,
        },
        orderBy: { createdAt: "asc" },
    })

    const rows = series.map((s) => ({
        id: s.id.length > 8 ? s.id.slice(0, 8) + "..." : s.id,
        slug: s.slug.length > 25 ? s.slug.slice(0, 25) + "..." : s.slug,
        title: s.title.length > 25 ? s.title.slice(0, 25) + "..." : s.title,
        isPublished: s.isPublished,
        createdAt: s.createdAt.toISOString().slice(0, 19),
    }))

    console.table(rows)
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
