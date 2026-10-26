import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect, unstable_rethrow } from "next/navigation"
import LessonViewer from "@/components/learn/LessonViewer"
import ServiceUnavailable from "@/components/system/ServiceUnavailable"
import { toSafeCourseDto, toSafeLessonDto } from "@/lib/courses/course-dto"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"

export default async function LearnLessonPage({
    params,
}: {
    params: Promise<{ courseSlug: string; lessonId: string }>
}) {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const { courseSlug, lessonId } = await params

    let lesson: any = null
    let course: any = null
    let userRole = session.user.role || "USER"
    let hasAccess = false
    let progressMap: Record<string, any> = {}

    try {
        // Find the lesson by ID
        lesson = await prisma.lesson.findFirst({
            where: {
                id: lessonId,
                chapter: {
                    course: {
                        slug: courseSlug,
                    },
                },
            },
            include: {
                chapter: {
                    include: {
                        course: {
                            include: {
                                chapters: {
                                    orderBy: { order: "asc" },
                                    include: {
                                        lessons: {
                                            orderBy: { order: "asc" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (lesson) {
            course = lesson.chapter.course

            if (!isCourseVisibleToUser(course, userRole)) {
                notFound()
            }

            const isTeacherOrAdmin = userRole === "ADMIN" || userRole === "TEACHER"
            const allLessonIds = course.chapters?.flatMap((c: any) => c.lessons?.map((l: any) => l.id) || []) || []

            const [accessCheck, progressRecords] = await Promise.all([
                isTeacherOrAdmin
                    ? Promise.resolve(true)
                    : course.isPremium
                    ? prisma.subscription.findFirst({
                          where: {
                              userId: session.user.id,
                              status: "ACTIVE",
                              endDate: { gte: new Date() },
                          },
                          select: { id: true },
                      }).then((sub) => !!sub)
                    : prisma.enrollment.findUnique({
                          where: {
                              userId_courseId: {
                                  userId: session.user.id,
                                  courseId: course.id,
                              },
                          },
                          select: { id: true },
                      }).then((en) => !!en),

                allLessonIds.length > 0
                    ? prisma.progress.findMany({
                          where: {
                              userId: session.user.id,
                              lessonId: { in: allLessonIds },
                          },
                      })
                    : Promise.resolve([]),
            ])

            hasAccess = accessCheck
            const map = new Map(progressRecords.map((p: any) => [p.lessonId, p]))
            progressMap = Object.fromEntries(map)
        }
    } catch (error) {
        // Preserve Next.js control flow (notFound/redirect) instead of swallowing it.
        unstable_rethrow(error)
        // Fail closed: a database error must never grant access or serve fabricated lessons.
        console.error("[learn] Failed to load lesson from the database", {
            courseSlug,
            lessonId,
            error,
        })
        return (
            <ServiceUnavailable
                title="Lesson unavailable"
                description="We could not load this lesson right now. Your progress is safe - please try again in a moment."
                homeHref={`/courses/${courseSlug}`}
                homeLabel="Back to course"
            />
        )
    }

    if (!lesson || !course) {
        notFound()
    }

    if (!isCourseVisibleToUser(course, userRole)) {
        notFound()
    }

    if (!hasAccess && !lesson.isTrial) {
        redirect(`/courses/${courseSlug}?locked=true`)
    }

    const safeCourse = toSafeCourseDto(course, hasAccess)
    const safeLesson = toSafeLessonDto(lesson, hasAccess)

    // Find current lesson index
    const allLessons = safeCourse.chapters.flatMap((c: any) =>
        c.lessons.map((l: any) => ({ ...l, chapterId: c.id, chapterTitle: c.title }))
    )
    const currentIndex = allLessons.findIndex((l: any) => l.id === safeLesson.id)
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null

    const isEditor = userRole === "ADMIN" || userRole === "TEACHER"

    return (
        <LessonViewer
            lesson={safeLesson}
            course={safeCourse}
            chapters={safeCourse.chapters}
            progressMap={progressMap}
            nextLesson={nextLesson}
            prevLesson={prevLesson}
            isEditor={isEditor}
        />
    )
}
