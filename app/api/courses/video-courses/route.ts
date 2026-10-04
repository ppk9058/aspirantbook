import { NextRequest, NextResponse } from "next/server"
import { getPublishedVideoCourses, verifyVideoCourseBySlug } from "@/lib/services/course-matcher"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")

    if (slug) {
        const result = await verifyVideoCourseBySlug(slug)
        return NextResponse.json(result, {
            headers: { "Cache-Control": "private, no-store" },
        })
    }

    const videoCourses = await getPublishedVideoCourses()
    return NextResponse.json(
        {
            total: videoCourses.length,
            courses: videoCourses,
        },
        {
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            },
        }
    )
}
