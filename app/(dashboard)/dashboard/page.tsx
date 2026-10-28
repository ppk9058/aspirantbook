import { unstable_cache } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAllBatches } from "@/lib/batches-service"
import StudentDashboardClient from "@/components/dashboard/StudentDashboardClient"
import { ALL_GOAL_COURSES } from "@/lib/goal-courses-data"
import { classifyCourse } from "@/lib/course-classifier"

import { cleanDescriptionSnippet } from "@/lib/utils"
import { getHomepagePromoCards } from "@/lib/homepage-cards-service"
import ServiceUnavailable from "@/components/system/ServiceUnavailable"

/**
 * B12: these cards used to show a rating of 4.8, 1000 learners, a "40 hours"
 * duration and 20 lessons whenever the real column was empty — including for a
 * course with no lessons at all. The card values are now the course's own
 * columns: the stored rating, the real enrollment count, and a duration derived
 * from the lesson durations (falling back to the course duration).
 */
function formatCourseDuration(minutes: number, lessonsCount: number): string {
    if (minutes > 0) {
        const hours = Math.floor(minutes / 60)
        const rest = minutes % 60
        if (hours > 0 && rest > 0) return `${hours}h ${rest}m`
        if (hours > 0) return `${hours}h`
        return `${rest}m`
    }
    if (lessonsCount > 0) {
        return lessonsCount === 1 ? "1 lesson" : `${lessonsCount} lessons`
    }
    return "Self-paced"
}

const getTopPublishedCourses = unstable_cache(
    async () => {
        const raw = await prisma.course.findMany({
            where: {
                status: "PUBLISHED",
            },
            take: 16,
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
                _count: { select: { enrollments: true } },
                chapters: {
                    select: {
                        lessons: {
                            select: { type: true, videoUrl: true, duration: true },
                        },
                    },
                },
            },
            orderBy: {
                enrollmentCount: "desc",
            },
        })

        return raw.map((c) => {
            const classified = classifyCourse(c)
            const lessons = c.chapters.flatMap((chapter) => chapter.lessons)
            const lessonMinutes = lessons.reduce(
                (total, lesson) => total + (lesson.duration ?? 0),
                0
            )
            const durationMinutes = lessonMinutes > 0 ? lessonMinutes : c.duration

            return {
                id: c.id,
                title: c.title,
                slug: c.slug,
                description: c.description ? cleanDescriptionSnippet(c.description, 160) : "",
                thumbnailUrl: c.thumbnailUrl || "/batch-blue.svg",
                difficulty: c.difficulty || "BEGINNER",
                rating: c.rating,
                enrollmentCount: c._count.enrollments,
                duration: formatCourseDuration(durationMinutes, lessons.length),
                isPremium: c.isPremium,
                tags: classified.tags,
                goalId: classified.goalId,
                category: classified.category,
                subject: classified.subject,
                isTutorial: classified.isTutorial,
                lessonsCount: lessons.length,
            }
        })
    },
    ["top-published-courses-dashboard-v2"],
    { revalidate: 60, tags: ["courses"] }
)

export default async function DashboardPage() {
    const session = await auth()

    // B12: the guest fallback used to claim XP 150, a 3-day streak and 2
    // achievements. A visitor with no account has none of those.
    let user: any = {
        id: session?.user?.id || "guest",
        name: session?.user?.name || "Student Learner",
        level: 1,
        xp: 0,
        streak: 0,
        _count: { enrollments: 0, achievements: 0 },
    }
    let enrollments: any[] = []
    let recommendedCourses: any[] = []
    let recentProgress: any[] = []
    let batches: any[] = []
    let completedLessonSet = new Set<string>()
    let totalTimeSpentSecs = 0

    let promoCards: any[] = []

    try {
        const [userData, enrollmentsData, recommendedData, recentData, batchesData, completedData, timeSpentData, promoCardsData] = await Promise.all([
            session?.user?.id
                ? prisma.user.findUnique({
                      where: { id: session.user.id },
                      select: {
                          id: true,
                          name: true,
                          level: true,
                          xp: true,
                          streak: true,
                          _count: {
                              select: {
                                  enrollments: true,
                                  achievements: true,
                              },
                          },
                      },
                  })
                : Promise.resolve(user),

            session?.user?.id
                ? prisma.enrollment.findMany({
                      where: {
                          userId: session.user.id,
                      },
                      select: {
                          enrolledAt: true,
                          course: {
                              select: {
                                  id: true,
                                  title: true,
                                  slug: true,
                                  thumbnailUrl: true,
                                  difficulty: true,
                                  chapters: {
                                      select: {
                                          lessons: {
                                              select: { id: true },
                                          },
                                      },
                                  },
                              },
                          },
                      },
                      take: 6,
                      orderBy: {
                          enrolledAt: "desc",
                      },
                  })
                : Promise.resolve([]),

            getTopPublishedCourses(),

            session?.user?.id
                ? prisma.progress.findMany({
                      where: {
                          userId: session.user.id,
                      },
                      select: {
                          id: true,
                          completed: true,
                          lastAccessed: true,
                          lesson: {
                              select: {
                                  title: true,
                                  chapter: {
                                      select: {
                                          course: {
                                              select: {
                                                  title: true,
                                              },
                                          },
                                      },
                                  },
                              },
                          },
                      },
                      orderBy: {
                          lastAccessed: "desc",
                      },
                      take: 5,
                  })
                : Promise.resolve([]),

            getAllBatches().catch(() => []),

            session?.user?.id
                ? prisma.progress.findMany({
                      where: {
                          userId: session.user.id,
                          completed: true,
                      },
                      select: { lessonId: true },
                  })
                : Promise.resolve([]),

            // B12: "hours learned" is the learner's recorded watch/read time
            // (seconds), not a fixed 8 hours.
            session?.user?.id
                ? prisma.progress.aggregate({
                      where: { userId: session.user.id },
                      _sum: { timeSpent: true },
                  })
                : Promise.resolve({ _sum: { timeSpent: 0 } }),

            getHomepagePromoCards().catch(() => []),
        ])

        if (userData) user = userData
        if (enrollmentsData) enrollments = enrollmentsData
        if (recentData) recentProgress = recentData
        if (Array.isArray(batchesData)) batches = batchesData
        if (Array.isArray(promoCardsData)) promoCards = promoCardsData
        totalTimeSpentSecs = timeSpentData?._sum?.timeSpent ?? 0

        const combinedCourses: any[] = [...ALL_GOAL_COURSES]
        if (recommendedData && recommendedData.length > 0) {
            recommendedData.forEach((dbc: any) => {
                if (dbc.isTutorial) return

                if (!combinedCourses.some((c) => c.id === dbc.id || c.slug === dbc.slug)) {
                    combinedCourses.push(dbc)
                }
            })
        }
        recommendedCourses = combinedCourses

        if (Array.isArray(completedData)) {
            completedLessonSet = new Set(completedData.map((p) => p.lessonId))
        }
    } catch (error) {
        // Fail closed: never render fabricated dashboard data when the database is unreachable.
        console.error("[dashboard] Failed to load dashboard data", error)
        return (
            <ServiceUnavailable
                title="Dashboard temporarily unavailable"
                description="We could not load your dashboard right now. Your progress is safe - please try again in a moment."
                homeHref="/"
                homeLabel="Back to home"
            />
        )
    }

    let inProgressCourses = enrollments.map((e: any) => {
        const lessonIds = e.course?.chapters?.flatMap((c: any) => c.lessons?.map((l: any) => l.id) || []) || []
        const totalLessons = lessonIds.length

        if (totalLessons === 0) {
            return {
                course: {
                    id: e.course.id,
                    title: e.course.title,
                    slug: e.course.slug,
                    thumbnailUrl: e.course.thumbnailUrl,
                    difficulty: e.course.difficulty,
                },
                progress: 0,
                lastAccessed: e.enrolledAt,
            }
        }

        const completedCount = lessonIds.filter((id: string) => completedLessonSet.has(id)).length

        return {
            course: {
                id: e.course.id,
                title: e.course.title,
                slug: e.course.slug,
                thumbnailUrl: e.course.thumbnailUrl,
                difficulty: e.course.difficulty,
            },
            progress: Math.round((completedCount / totalLessons) * 100),
            lastAccessed: e.enrolledAt,
        }
    })

    // B12: derive each stat from the row, with no invented fallback. Hours are
    // rounded to one decimal so a short session is not reported as 0h.
    const stats = {
        coursesEnrolled: user?._count?.enrollments ?? inProgressCourses.length,
        achievements: user?._count?.achievements ?? 0,
        streak: user?.streak ?? 0,
        hoursLearned: Math.round((totalTimeSpentSecs / 3600) * 10) / 10,
    }

    return (
        <StudentDashboardClient
            user={user}
            inProgressCourses={inProgressCourses}
            recommendedCourses={recommendedCourses}
            recentProgress={recentProgress}
            batches={batches.slice(0, 4).map((b: any) => ({
                id: b.id,
                slug: b.slug,
                title: b.title,
                classTag: b.classTag,
                category: b.category,
                startDate: b.startDate,
                scheduleText: b.scheduleText,
                teachers: Array.from({ length: b.teachers?.length || 0 }),
            }))}
            promoCards={promoCards}
            stats={stats}
        />
    )
}
