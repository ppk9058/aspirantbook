"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Get paginated list of users with filters
export async function getUsersList(params: {
    page?: number
    limit?: number
    role?: "ADMIN" | "PREMIUM" | "FREE"
    search?: string
    subscriptionStatus?: "ACTIVE" | "EXPIRED" | "CANCELLED"
}) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { page = 1, limit = 20, role, search, subscriptionStatus } = params

    const where: any = {}

    if (role) {
        where.role = role
    }

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ]
    }

    // For subscription status filter, we need to join with subscriptions
    const users = await prisma.user.findMany({
        where,
        include: {
            subscriptions: {
                orderBy: { createdAt: "desc" },
                take: 1,
            },
            _count: {
                select: {
                    enrollments: true,
                    progress: true,
                },
            },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
    })

    // Filter by subscription status if provided
    let filteredUsers = users
    if (subscriptionStatus) {
        filteredUsers = users.filter(user => {
            const latestSub = user.subscriptions[0]
            if (!latestSub) return subscriptionStatus === "EXPIRED"
            return latestSub.status === subscriptionStatus
        })
    }

    const total = await prisma.user.count({ where })

    return {
        users: filteredUsers,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
}

// Get detailed user information
export async function getUserDetails(userId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            subscriptions: {
                orderBy: { createdAt: "desc" },
                include: {
                    payments: true,
                },
            },
            enrollments: {
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            isPremium: true,
                        },
                    },
                },
                orderBy: { enrolledAt: "desc" },
            },
            progress: {
                include: {
                    lesson: {
                        select: {
                            id: true,
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
                orderBy: { lastAccessed: "desc" },
                take: 10,
            },
        },
    })

    if (!user) {
        throw new Error("User not found")
    }

    return user
}

// Update user role
export async function updateUserRole(userId: string, newRole: "ADMIN" | "TEACHER" | "PREMIUM" | "FREE") {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Prevent admin from demoting themselves
    if (userId === session.user.id && newRole !== "ADMIN") {
        throw new Error("Cannot change your own admin role")
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true, message: "User role updated successfully" }
}

// Manually activate subscription (for testing or support)
export async function manuallyActivateSubscription(
    userId: string,
    plan: "MONTHLY" | "YEARLY",
    durationMonths: number
) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + durationMonths)

    await prisma.subscription.create({
        data: {
            userId,
            plan,
            status: "ACTIVE",
            provider: "MANUAL",
            providerId: `manual-${Date.now()}`,
            startDate,
            endDate,
        },
    })

    // Update user role to PREMIUM
    await prisma.user.update({
        where: { id: userId },
        data: { role: "PREMIUM" },
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true, message: "Subscription activated successfully" }
}

// Cancel subscription
export async function cancelUserSubscription(subscriptionId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
            status: "CANCELLED",
            cancelAtPeriodEnd: true,
        },
    })

    revalidatePath("/admin/users")

    return { success: true, message: "Subscription cancelled" }
}

// Enroll user in course
export async function enrollUserInCourse(userId: string, courseId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId,
                courseId,
            },
        },
    })

    if (existing) {
        throw new Error("User is already enrolled in this course")
    }

    await prisma.enrollment.create({
        data: {
            userId,
            courseId,
        },
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true, message: "User enrolled successfully" }
}

// Unenroll user from course
export async function unenrollUserFromCourse(userId: string, courseId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    await prisma.enrollment.delete({
        where: {
            userId_courseId: {
                userId,
                courseId,
            },
        },
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true, message: "User unenrolled successfully" }
}

// Update user profile
export async function updateUserProfile(userId: string, data: { name?: string; email?: string }) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            name: data.name,
            email: data.email,
        },
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true, message: "Profile updated successfully" }
}

// Permanently delete user and revoke access
export async function deleteUser(userId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can delete users")
    }

    if (userId === session.user.id) {
        throw new Error("Cannot delete your own admin account")
    }

    await prisma.user.delete({
        where: { id: userId },
    })

    revalidatePath("/admin/users")

    return { success: true, message: "User deleted successfully" }
}
