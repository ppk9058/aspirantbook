import { prisma } from "@/lib/prisma"
import { hasActivePass } from "@/lib/auth/entitlements"

export async function canAccessCourse(userId: string, courseId: string): Promise<boolean> {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { isPremium: true },
    })

    if (!course) return false

    // Free courses are accessible to everyone
    if (!course.isPremium) return true

    // Pass entitlement is checked against the DATABASE only (single source of truth: hasActivePass).
    // No legacy session/DB role === "PREMIUM" shortcut.
    return hasActivePass(userId)
}

export async function canAccessLesson(userId: string, lessonId: string): Promise<boolean> {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            chapter: {
                include: {
                    course: {
                        select: {
                            id: true,
                            isPremium: true,
                        },
                    },
                },
            },
        },
    })

    if (!lesson) return false

    // Pass holders and admins have full access
    if (await hasActivePass(userId)) {
        return true
    }

    // For FREE users, check if enrolled
    const enrollment = await prisma.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: userId,
                courseId: lesson.chapter.course.id,
            },
        },
    })

    if (!enrollment) return false

    // Finally check course premium status (redundant for free users but safe)
    return canAccessCourse(userId, lesson.chapter.course.id)
}

export async function requiresPremium(courseId: string): Promise<boolean> {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { isPremium: true },
    })

    return course?.isPremium || false
}

export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await prisma.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: userId,
                courseId: courseId,
            },
        },
    })

    return !!enrollment
}
