"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function markLessonComplete(lessonId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    // Check if already completed
    const existingProgress = await prisma.progress.findUnique({
        where: {
            userId_lessonId: {
                userId: session.user.id,
                lessonId: lessonId,
            },
        },
    })

    if (existingProgress?.completed) {
        return { success: true }
    }

    // Get lesson details for XP reward
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { xpReward: true }
    })

    // Transaction to update progress and user stats
    await prisma.$transaction(async (tx) => {
        // 1. Update/Create Progress
        if (existingProgress) {
            await tx.progress.update({
                where: { id: existingProgress.id },
                data: { completed: true },
            })
        } else {
            await tx.progress.create({
                data: {
                    userId: session.user.id,
                    lessonId: lessonId,
                    completed: true,
                    timeSpent: 0,
                },
            })
        }

        // 2. Update User XP and Streak
        const user = await tx.user.findUnique({
            where: { id: session.user.id },
            select: { xp: true, lastActive: true, streak: true }
        })

        if (user) {
            const now = new Date()
            const lastActive = user.lastActive ? new Date(user.lastActive) : new Date(0)

            // Check if streak should continue (active yesterday or today)
            const isToday = now.toDateString() === lastActive.toDateString()
            const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === lastActive.toDateString()

            let newStreak = user.streak
            if (!isToday) {
                if (isYesterday) {
                    newStreak += 1
                } else {
                    newStreak = 1 // Reset streak if missed a day
                }
            }

            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    xp: user.xp + (lesson?.xpReward || 10),
                    streak: newStreak,
                    lastActive: new Date(), // Reset to now
                }
            })
        }
    })

    revalidatePath("/learn")
    revalidatePath("/my-learning")
    revalidatePath("/") // Update dashboard stats

    return { success: true }
}

export async function toggleLessonCompletion(lessonId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const userId = session.user.id
    const existingProgress = await prisma.progress.findUnique({
        where: {
            userId_lessonId: {
                userId,
                lessonId,
            },
        },
    })

    const targetCompleted = !existingProgress?.completed

    if (existingProgress) {
        await prisma.progress.update({
            where: { id: existingProgress.id },
            data: {
                completed: targetCompleted,
                lastAccessed: new Date(),
            },
        })
    } else {
        await prisma.progress.create({
            data: {
                userId,
                lessonId,
                completed: true,
                timeSpent: 0,
            },
        })
    }

    revalidatePath("/learn")
    revalidatePath("/my-learning")

    return { success: true, completed: targetCompleted }
}

export async function trackVideoProgress(lessonId: string, timeSpent: number) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const existingProgress = await prisma.progress.findUnique({
        where: {
            userId_lessonId: {
                userId: session.user.id,
                lessonId: lessonId,
            },
        },
    })

    if (existingProgress) {
        await prisma.progress.update({
            where: { id: existingProgress.id },
            data: { timeSpent: existingProgress.timeSpent + timeSpent },
        })
    } else {
        await prisma.progress.create({
            data: {
                userId: session.user.id,
                lessonId: lessonId,
                completed: false,
                timeSpent: timeSpent,
            },
        })
    }

    return { success: true }
}

export async function getNextLesson(currentLessonId: string) {
    const lesson = await prisma.lesson.findUnique({
        where: { id: currentLessonId },
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

    if (!lesson) return null

    const allLessons = lesson.chapter.course.chapters.flatMap(c => c.lessons)
    const currentIndex = allLessons.findIndex(l => l.id === currentLessonId)

    if (currentIndex < allLessons.length - 1) {
        return allLessons[currentIndex + 1]
    }

    return null
}

export async function getCourseProgress(courseId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return { progress: 0, completedLessons: 0, totalLessons: 0 }
    }

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            chapters: {
                include: {
                    lessons: true,
                },
            },
        },
    })

    if (!course) {
        return { progress: 0, completedLessons: 0, totalLessons: 0 }
    }

    const allLessonIds = course.chapters.flatMap(c => c.lessons.map(l => l.id))
    const completedCount = await prisma.progress.count({
        where: {
            userId: session.user.id,
            lessonId: { in: allLessonIds },
            completed: true,
        },
    })

    const progress = allLessonIds.length > 0 ? (completedCount / allLessonIds.length) * 100 : 0

    return {
        progress,
        completedLessons: completedCount,
        totalLessons: allLessonIds.length,
    }
}
