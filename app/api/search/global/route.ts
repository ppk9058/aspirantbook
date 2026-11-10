import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildResultUrl } from "@/lib/search/result-url"
/**
 * Global search API: searches across published test series, courses, and tutorials.
 * Returns grouped results for the landing header search.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    
    // Validate query length (min 2, max 64 chars)
    if (!query || query.trim().length < 2) {
        return NextResponse.json({
            testSeries: [],
            courses: [],
            tutorials: [],
        })
    }
    
    if (query.length > 64) {
        return NextResponse.json(
            { error: "Query too long (max 64 characters)" },
            { status: 400 }
        )
    }
    
    const searchTerm = query.trim()
    try {
        // Search published test series (if model exists)
        let testSeries: any[] = []
        try {
            testSeries = await (prisma as any).testSeries?.findMany({
                where: {
                    isPublished: true,
                    OR: [
                        { title: { contains: searchTerm, mode: "insensitive" } },
                        { description: { contains: searchTerm, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                },
                take: 5,
                orderBy: { createdAt: "desc" },
            }) || []
        } catch (e) {
            // TestSeries model may not exist
            console.warn("TestSeries search skipped:", e)
        }
        // Search published courses
        const courses = await prisma.course.findMany({
            where: {
                isPublished: true,
                OR: [
                    { title: { contains: searchTerm, mode: "insensitive" } },
                    { description: { contains: searchTerm, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                slug: true,
                title: true,
            },
            take: 5,
            orderBy: { createdAt: "desc" },
        })
        // Search published tutorials (if model exists)
        let tutorials: any[] = []
        try {
            tutorials = await (prisma as any).tutorial?.findMany({
                where: {
                    isPublished: true,
                    OR: [
                        { title: { contains: searchTerm, mode: "insensitive" } },
                        { description: { contains: searchTerm, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                },
                take: 5,
                orderBy: { createdAt: "desc" },
            }) || []
        } catch (e) {
            // Tutorial model may not exist
            console.warn("Tutorial search skipped:", e)
        }
        return NextResponse.json({
            testSeries: testSeries.map((ts: any) => ({
                id: ts.id,
                title: ts.title,
                href: buildResultUrl("testSeries", ts),
            })),
            courses: courses.map((c) => ({
                id: c.id,
                title: c.title,
                href: buildResultUrl("course", c),
            })),
            tutorials: tutorials.map((t: any) => ({
                id: t.id,
                title: t.title,
                href: buildResultUrl("tutorial", t),
            })),
        })
    } catch (error) {
        console.error("Global search error:", error)
        return NextResponse.json(
            {
                testSeries: [],
                courses: [],
                tutorials: [],
                error: "Search failed",
            },
            { status: 500 }
        )
    }
}
