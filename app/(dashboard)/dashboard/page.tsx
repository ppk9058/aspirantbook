import { unstable_cache } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAllBatches } from "@/lib/batches-service"
import StudentDashboardClient from "@/components/dashboard/StudentDashboardClient"
import { ALL_GOAL_COURSES } from "@/lib/goal-courses-data"
import { classifyCourse } from "@/lib/course-classifier"

import { cleanDescriptionSnippet } from "@/lib/utils"
import { getHomepagePromoCards } from "@/lib/homepage-cards-service"

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
                technology: true,
                chapters: {
                    select: {
                        lessons: {
                            select: { type: true, videoUrl: true },
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
            return {
                id: c.id,
                title: c.title,
                slug: c.slug,
                description: c.description ? cleanDescriptionSnippet(c.description, 160) : "",
                thumbnailUrl: c.thumbnailUrl || "/batch-blue.svg",
                difficulty: c.difficulty || "BEGINNER",
                rating: c.rating || 4.8,
                enrollmentCount: c.enrollmentCount || 1000,
                duration: "40 hours",
                isPremium: false,
                tags: classified.tags,
                goalId: classified.goalId,
                category: classified.category,
                subject: classified.subject,
                isTutorial: classified.isTutorial,
                lessonsCount: 20,
            }
        })
    },
    ["top-published-courses-dashboard-v2"],
    { revalidate: 60, tags: ["courses"] }
)

export default async function DashboardPage() {
    const session = await auth()

    let user: any = {
        id: session?.user?.id || "demo-student",
        name: session?.user?.name || "Student Learner",
        level: 1,
        xp: 150,
        streak: 3,
        _count: { enrollments: 0, achievements: 2 },
    }
    let enrollments: any[] = []
    let recommendedCourses: any[] = []
    let recentProgress: any[] = []
    let batches: any[] = []
    let completedLessonSet = new Set<string>()

    let promoCards: any[] = []

    try {
        const [userData, enrollmentsData, recommendedData, recentData, batchesData, completedData, promoCardsData] = await Promise.all([
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

            getHomepagePromoCards().catch(() => []),
        ])

        if (userData) user = userData
        if (enrollmentsData) enrollments = enrollmentsData
        if (recentData) recentProgress = recentData
        if (Array.isArray(batchesData)) batches = batchesData
        if (Array.isArray(promoCardsData)) promoCards = promoCardsData

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
    } catch {
        console.warn("Database offline on /dashboard, serving fallback data.")
        recommendedCourses = ALL_GOAL_COURSES
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

    const stats = {
        coursesEnrolled: user?._count?.enrollments || inProgressCourses.length,
        achievements: user?._count?.achievements || 2,
        streak: user?.streak || 3,
        hoursLearned: 8,
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
