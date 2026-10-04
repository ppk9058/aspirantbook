import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

export interface RealVideoCourseMeta {
    id: string
    title: string
    slug: string
    description: string
    price: number | null
    originalPrice: number | null
    thumbnailUrl: string | null
    totalLessons: number
    videoLessonCount: number
    hasVideos: boolean
}

/**
 * Fetches only real published VIDEO courses from the database.
 * Filters out courses that are purely text-based / reading tutorials.
 */
async function fetchPublishedVideoCourses(): Promise<RealVideoCourseMeta[]> {
    try {
        const courses = await prisma.course.findMany({
            where: {
                isPublished: true,
                status: "PUBLISHED",
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                price: true,
                originalPrice: true,
                thumbnailUrl: true,
                chapters: {
                    select: {
                        lessons: {
                            select: {
                                id: true,
                                type: true,
                                videoUrl: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        const videoCourses: RealVideoCourseMeta[] = []

        for (const course of courses) {
            const allLessons = course.chapters.flatMap((ch) => ch.lessons)
            const videoLessons = allLessons.filter(
                (l) => l.type === "VIDEO" || Boolean(l.videoUrl && l.videoUrl.trim().length > 0)
            )

            // Strictly only include courses that have at least 1 video lesson
            if (videoLessons.length > 0) {
                videoCourses.push({
                    id: course.id,
                    title: course.title,
                    slug: course.slug,
                    description: course.description,
                    price: course.price,
                    originalPrice: course.originalPrice,
                    thumbnailUrl: course.thumbnailUrl,
                    totalLessons: allLessons.length,
                    videoLessonCount: videoLessons.length,
                    hasVideos: true,
                })
            }
        }

        return videoCourses
    } catch (error) {
        console.error("Error fetching published video courses:", error)
        return []
    }
}

export const getPublishedVideoCourses = unstable_cache(
    fetchPublishedVideoCourses,
    ["published-video-courses"],
    { revalidate: 60, tags: ["courses"] }
)

/**
 * Validates if a course exists in DB by slug and has video content.
 */
export async function verifyVideoCourseBySlug(slug: string): Promise<{
    exists: boolean
    hasVideos: boolean
    course?: RealVideoCourseMeta
}> {
    try {
        const course = await prisma.course.findUnique({
            where: { slug },
            include: {
                chapters: {
                    include: {
                        lessons: {
                            select: {
                                id: true,
                                type: true,
                                videoUrl: true,
                            },
                        },
                    },
                },
            },
        })

        if (!course) {
            return { exists: false, hasVideos: false }
        }

        const allLessons = course.chapters.flatMap((ch) => ch.lessons)
        const videoLessons = allLessons.filter(
            (l) => l.type === "VIDEO" || Boolean(l.videoUrl && l.videoUrl.trim().length > 0)
        )

        return {
            exists: true,
            hasVideos: videoLessons.length > 0,
            course: {
                id: course.id,
                title: course.title,
                slug: course.slug,
                description: course.description,
                price: course.price,
                originalPrice: course.originalPrice,
                thumbnailUrl: course.thumbnailUrl,
                totalLessons: allLessons.length,
                videoLessonCount: videoLessons.length,
                hasVideos: videoLessons.length > 0,
            },
        }
    } catch (error) {
        console.error(`Error verifying course slug "${slug}":`, error)
        return { exists: false, hasVideos: false }
    }
}
