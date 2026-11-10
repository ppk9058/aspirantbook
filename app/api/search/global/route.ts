import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildResultUrl } from "@/lib/search/result-url"
import { isTextTutorialCourse } from "@/lib/course-classifier"

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
        // Search published test series using the real ExamSeries model
        const testSeries = await prisma.examSeries.findMany({
            where: {
                isPublished: true,
                isArchived: false,
                OR: [
                    { title: { contains: searchTerm, mode: "insensitive" } },
                    { description: { contains: searchTerm, mode: "insensitive" } },
                    { examName: { contains: searchTerm, mode: "insensitive" } },
                    { category: { contains: searchTerm, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                slug: true,
                title: true,
            },
            take: 5,
            orderBy: { createdAt: "desc" },
        }).catch((err) => {
            console.error("ExamSeries search failed:", err)
            throw err
        })

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
        }).catch((err) => {
            console.error("Courses search failed:", err)
            throw err
        })

        // Search published tutorials (stored in prisma.course as text tutorials authored in Tutorial Studio)
        const candidateTutorials = await prisma.course.findMany({
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
                chapters: {
                    select: {
                        lessons: {
                            select: {
                                type: true,
                                videoUrl: true,
                            },
                        },
                    },
                },
            },
            take: 10,
            orderBy: { createdAt: "desc" },
        }).catch((err) => {
            console.error("Tutorials search failed:", err)
            throw err
        })
        const tutorials = candidateTutorials.filter(isTextTutorialCourse).slice(0, 5)

        return NextResponse.json({
            testSeries: testSeries.map((ts) => ({
                id: ts.id,
                title: ts.title,
                href: buildResultUrl("testSeries", ts),
            })),
            courses: courses.map((c) => ({
                id: c.id,
                title: c.title,
                href: buildResultUrl("course", c),
            })),
            tutorials: tutorials.map((t) => ({
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
