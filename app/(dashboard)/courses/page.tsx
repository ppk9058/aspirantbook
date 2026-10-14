export const dynamic = "force-dynamic"

import { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export const metadata: Metadata = {
    title: "All Video Courses & Batches | aspirantbook",
    description: "Explore all comprehensive video courses, academic foundations, and competitive batches on aspirantbook.",
    alternates: {
        canonical: "/courses",
    },
    openGraph: {
        title: "All Video Courses & Batches | aspirantbook",
        description: "Explore all comprehensive video courses, academic foundations, and competitive batches on aspirantbook.",
        url: "/courses",
    },
}
import CourseClient from "@/components/courses/CourseClient"
import { classifyCourse } from "@/lib/course-classifier"
import { cleanDescriptionSnippet } from "@/lib/utils"
import { cookies } from "next/headers"
import { getStudentGoals } from "@/lib/goals/student-goals"
import { applyCourseGoalFilter } from "@/lib/goals/goal-filters"
import { getCourseBadges } from "@/lib/coupons/badge-query"

async function fetchPublishedDbCourses() {
    const courses = await prisma.course.findMany({
        where: {
            status: "PUBLISHED",
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            thumbnailUrl: true,
            difficulty: true,
            rating: true,
            enrollmentCount: true,
            duration: true,
            isPremium: true,
            technology: true,
            chapters: {
                select: {
                    lessons: {
                        select: { type: true, videoUrl: true },
                    },
                },
            },
        },
    })

    // Pre-classify on server to completely omit nested chapters/lessons payload
    return courses.map((c) => {
        const classified = classifyCourse(c)
        return {
            id: c.id,
            title: c.title,
            slug: c.slug,
            description: c.description ? cleanDescriptionSnippet(c.description, 200) : "",
            thumbnailUrl: c.thumbnailUrl,
            difficulty: c.difficulty,
            rating: c.rating,
            enrollmentCount: c.enrollmentCount,
            duration: c.duration,
            isPremium: c.isPremium,
            technology: c.technology,
            isTutorial: classified.isTutorial,
            goalId: classified.goalId,
            category: classified.category,
            subject: classified.subject,
            tags: classified.tags,
        }
    })
}

const getCachedPublishedDbCourses = unstable_cache(
    fetchPublishedDbCourses,
    ["published-courses-list-slim-v2"],
    { revalidate: 60, tags: ["courses"] }
)

const getPublishedDbCourses =
    process.env.APP_ENV === "test" ? fetchPublishedDbCourses : getCachedPublishedDbCourses

export default async function CoursesPage() {
    const session = await auth()

    // Determine student's active Global Goals server-side (authoritative DB source):
    const cookieStore = await cookies()
    const cookieGoal = cookieStore.get("trillion_selected_goal")?.value || null
    const { goalIds, primaryGoal } = await getStudentGoals(session?.user?.id, cookieGoal)

    let dbCourses: any[] = []
    let enrolledCourseIds: string[] = []
    let completedCourseIds: string[] = []
    const bookmarkedCourseIds: string[] = []
    let badgeMap: Record<string, any> = {}

    try {
        const [published, enrollments] = await Promise.all([
            getPublishedDbCourses(),
            session?.user?.id
                ? prisma.enrollment.findMany({
                      where: { userId: session.user.id },
                      select: { courseId: true, completedAt: true },
                  })
                : Promise.resolve([]),
        ])

        // Server-side strict multi-goal filtering
        const filteredPublished = goalIds.length > 0 ? applyCourseGoalFilter(published, goalIds) : published

        dbCourses = filteredPublished
        enrolledCourseIds = enrollments.map((e) => e.courseId)
        completedCourseIds = enrollments
            .filter((e) => e.completedAt !== null)
            .map((e) => e.courseId)

        const allIds = dbCourses.map((c) => c.id)
        if (allIds.length > 0) {
            badgeMap = await getCourseBadges(allIds)
        }
    } catch {
        console.warn("Database offline on /courses, serving fallback courses.")
    }

    return (
        <CourseClient
            key={goalIds.join(",") || "all"}
            dbCourses={dbCourses}
            enrolledCourseIds={enrolledCourseIds}
            completedCourseIds={completedCourseIds}
            bookmarkedCourseIds={bookmarkedCourseIds}
            badgeMap={badgeMap}
            serverGoalIds={goalIds}
        />
    )
}
