import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import MyLearningClient from "@/components/learning/MyLearningClient"
import { formatUtcToIst } from "@/lib/demo/slot-utils"

export default async function MyLearningPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    let enrollments: any[] = []
    let progressRecords: any[] = []
    let upcomingDemos: any[] = []
    let attendedDemos: any[] = []

    try {
        const [user, demoBookings] = await Promise.all([
            prisma.user.findUnique({
                where: { id: session.user.id },
                include: {
                    enrollments: {
                        include: {
                            course: {
                                include: {
                                    chapters: {
                                        include: {
                                            lessons: {
                                                select: { id: true, title: true, type: true, order: true },
                                                orderBy: { order: "asc" },
                                            },
                                        },
                                        orderBy: { order: "asc" },
                                    },
                                },
                            },
                        },
                        orderBy: { enrolledAt: "desc" },
                    },
                    progress: true,
                },
            }),
            prisma.demoBooking.findMany({
                where: { studentId: session.user.id },
                include: {
                    slot: true,
                    course: true,
                },
                orderBy: { createdAt: "desc" },
            }),
        ])

        if (user) {
            enrollments = user.enrollments
            progressRecords = user.progress

            // Include courses with progress
            const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId || e.course?.id))
            const lessonIdsWithProgress = progressRecords.map((p) => p.lessonId)

            if (lessonIdsWithProgress.length > 0) {
                const watchedLessons = await prisma.lesson.findMany({
                    where: { id: { in: lessonIdsWithProgress } },
                    select: { chapter: { select: { courseId: true } } },
                })
                const unEnrolledCourseIds = Array.from(
                    new Set(
                        watchedLessons
                            .map((l) => l.chapter?.courseId)
                            .filter((cid): cid is string => Boolean(cid && !enrolledCourseIds.has(cid)))
                    )
                )

                if (unEnrolledCourseIds.length > 0) {
                    const watchedCourses = await prisma.course.findMany({
                        where: { id: { in: unEnrolledCourseIds } },
                        include: {
                            chapters: {
                                include: {
                                    lessons: {
                                        select: { id: true, title: true, type: true, order: true },
                                        orderBy: { order: "asc" },
                                    },
                                },
                                orderBy: { order: "asc" },
                            },
                        },
                    })

                    for (const watched of watchedCourses) {
                        enrollments.push({
                            id: `watch-${watched.id}`,
                            courseId: watched.id,
                            enrolledAt: new Date().toISOString(),
                            course: watched,
                        })
                    }
                }
            }
        }

        // Process Demo Bookings into Upcoming & Watched
        for (const b of demoBookings) {
            if (!b.course || !b.slot) continue

            const isSlotEnded = b.slot.status === "ENDED"
            const isAttended = b.status === "ATTENDED" || b.status === "JOINED" || isSlotEnded

            if (isAttended) {
                attendedDemos.push(b)
            } else if (b.slot.status === "SCHEDULED" || b.slot.status === "LIVE") {
                const ist = formatUtcToIst(b.slot.startTime)
                upcomingDemos.push({
                    id: b.id,
                    slotId: b.slotId,
                    courseId: b.course.id,
                    courseSlug: b.course.slug,
                    courseTitle: b.course.title,
                    timeLabel: ist.fullLabel,
                    dateLabel: ist.dateLabel,
                    clockLabel: ist.timeLabel,
                    status: b.slot.status,
                    startTime: b.slot.startTime.toISOString(),
                    topic: b.slot.topic || b.course.title,
                    facultyName: b.slot.facultyName,
                })
            }
        }
    } catch {
        console.warn("Database error on /my-learning, using fallback data.")
    }

    // Calculate detailed progress for each regular course
    const coursesWithProgress: any[] = enrollments.map((enrollment) => {
        const allLessons = enrollment.course.chapters?.flatMap((chapter: any) => chapter.lessons) || []
        const totalLessons = allLessons.length

        const courseLessonIds = allLessons.map((l: any) => l.id)
        const completedLessonIds = progressRecords
            .filter((p: any) => courseLessonIds.includes(p.lessonId) && p.completed)
            .map((p: any) => p.lessonId)

        const completedLessons = completedLessonIds.length
        const progressPercentage =
            enrollment.course.slug === "choosing-a-career-in-tech"
                ? 20
                : totalLessons > 0
                ? (completedLessons / totalLessons) * 100
                : 0

        const nextLesson = allLessons.find((lesson: any) => !completedLessonIds.includes(lesson.id))
        const timeSpent = completedLessons * 15

        // Match any upcoming demo for this enrolled course
        const matchingDemo = upcomingDemos.find(
            (d) => d.courseId === enrollment.courseId || d.courseSlug === enrollment.course.slug
        )

        return {
            id: enrollment.id,
            courseId: enrollment.courseId,
            enrolledAt: enrollment.enrolledAt,
            course: enrollment.course,
            totalLessons,
            completedLessons,
            progressPercentage,
            completedLessonIds,
            nextLesson,
            timeSpent,
            isCompleted: progressPercentage === 100,
            isDemoWatched: false,
            upcomingDemo: matchingDemo || undefined,
        }
    })

    // Ensure every course with an upcoming demo appears in My Batches even if not enrolled yet
    for (const demo of upcomingDemos) {
        const alreadyExists = coursesWithProgress.some(
            (c) => c.courseId === demo.courseId || c.course?.slug === demo.courseSlug
        )
        if (!alreadyExists) {
            coursesWithProgress.push({
                id: `demo-slot-${demo.slotId}`,
                courseId: demo.courseId,
                enrolledAt: new Date().toISOString(),
                course: {
                    id: demo.courseId,
                    title: demo.courseTitle,
                    slug: demo.courseSlug,
                    difficulty: "BEGINNER",
                    thumbnailUrl: null,
                    technology: "Live Interactive Demo",
                    chapters: [],
                },
                totalLessons: 1,
                completedLessons: 0,
                progressPercentage: 0,
                completedLessonIds: [],
                timeSpent: 0,
                isCompleted: false,
                isDemoWatched: false,
                upcomingDemo: demo,
            })
        }
    }

    // Add attended demo classes to "Watched / Completed" section with "Demo Watched" flag
    for (const b of attendedDemos) {
        coursesWithProgress.push({
            id: `demo-${b.id}`,
            courseId: b.courseId,
            enrolledAt: b.joinedAt || b.createdAt,
            course: {
                id: b.course.id,
                title: b.course.title,
                slug: b.course.slug,
                difficulty: "BEGINNER",
                thumbnailUrl: b.course.thumbnailUrl,
                technology: b.course.technology || "Live Demo",
                chapters: [],
            },
            totalLessons: 1,
            completedLessons: 0,
            progressPercentage: 0, // Accurately keep 0% curriculum progress
            completedLessonIds: [],
            timeSpent: Math.round((b.watchSeconds || 0) / 60),
            isCompleted: true, // Lands in "Completed / Watched" tab
            isDemoWatched: true,
            demoSlotId: b.slotId,
        })
    }

    return (
        <MyLearningClient
            courses={coursesWithProgress}
            upcomingDemos={upcomingDemos}
        />
    )
}
