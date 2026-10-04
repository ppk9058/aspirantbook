import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import CourseClient from "@/components/courses/CourseClient"
import { classifyCourse } from "@/lib/course-classifier"
import { cleanDescriptionSnippet } from "@/lib/utils"

const getPublishedDbCourses = unstable_cache(
    async () => {
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
    },
    ["published-courses-list-slim-v1"],
    { revalidate: 60, tags: ["courses"] }
)

export default async function CoursesPage() {
    const session = await auth()

    let dbCourses: any[] = []
    let enrolledCourseIds: string[] = []
    let completedCourseIds: string[] = []
    const bookmarkedCourseIds: string[] = []

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

        dbCourses = published
        enrolledCourseIds = enrollments.map((e) => e.courseId)
        completedCourseIds = enrollments
            .filter((e) => e.completedAt !== null)
            .map((e) => e.courseId)
    } catch {
        console.warn("Database offline on /courses, serving fallback courses.")
    }

    return (
        <CourseClient
            dbCourses={dbCourses}
            enrolledCourseIds={enrolledCourseIds}
            completedCourseIds={completedCourseIds}
            bookmarkedCourseIds={bookmarkedCourseIds}
        />
    )
}
