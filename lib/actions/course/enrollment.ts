"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { hasActivePass } from "@/lib/auth/entitlements"

export async function enrollInCourse(courseId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: courseId,
            },
        },
    })

    if (existingEnrollment) {
        return { success: true, message: "Already enrolled" }
    }

    // Check if course requires premium
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { isPremium: true },
    })

    if (!course) {
        throw new Error("Course not found")
    }

    // Check if user has an active Pass (or admin role) for premium courses
    if (course.isPremium) {
        const isEntitled = await hasActivePass(session.user.id)
        if (!isEntitled) {
            throw new Error("Active Pass required")
        }
    }

    // Create enrollment
    await prisma.enrollment.create({
        data: {
            userId: session.user.id,
            courseId: courseId,
        },
    })

    revalidatePath("/courses")
    revalidatePath("/my-learning")

    return { success: true, message: "Enrolled successfully" }
}

export async function checkEnrollmentStatus(courseId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return { enrolled: false }
    }

    const enrollment = await prisma.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: courseId,
            },
        },
    })

    return { enrolled: !!enrollment }
}

export async function unenrollFromCourse(courseId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    await prisma.enrollment.delete({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: courseId,
            },
        },
    })

    revalidatePath("/courses")
    revalidatePath("/my-learning")

    return { success: true, message: "Unenrolled successfully" }
}
