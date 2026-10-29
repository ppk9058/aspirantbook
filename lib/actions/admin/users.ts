"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/auth/tokens"
import bcrypt from "bcryptjs"
import { MAX_CSV_USERS, csvCell } from "@/lib/admin/csv"
import { getClientIp as getSafeClientIp } from "@/lib/rate-limit"

async function getClientIp(): Promise<string> {
    try {
        const { headers } = await import("next/headers")
        const h = await headers()
        return getSafeClientIp(h)
    } catch {
        return "127.0.0.1"
    }
}

async function writeAuditLog(actorId: string, action: string, targetId?: string, metadata?: any) {
    const ip = await getClientIp()
    try {
        await prisma.auditLog.create({
            data: {
                actorId,
                action,
                targetId: targetId || null,
                metadata: metadata ? metadata : undefined,
                ip,
            },
        })
    } catch (err) {
        console.error("Audit log error:", err)
    }
}

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

    // A10: apply the subscription filter in the query so pagination and totals
    // are computed over the filtered set, not a post-hoc page slice.
    if (subscriptionStatus) {
        const now = new Date()
        if (subscriptionStatus === "ACTIVE") {
            where.subscriptions = { some: { status: "ACTIVE", endDate: { gt: now } } }
        } else if (subscriptionStatus === "CANCELLED") {
            where.subscriptions = { some: { status: "CANCELLED" } }
        } else {
            where.subscriptions = { none: { status: "ACTIVE", endDate: { gt: now } } }
        }
    }

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
        // Never ship password hashes to the admin client.
        omit: { password: true },
    })

    const total = await prisma.user.count({ where })

    return {
        users,
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
        omit: { password: true },
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
        throw new Error("Unauthorized: Only Admins can manage user roles")
    }

    // Prevent admin from demoting themselves
    if (userId === session.user.id && newRole !== "ADMIN") {
        throw new Error("Cannot change your own admin role")
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, email: true },
    })

    if (target?.role === "ADMIN" && newRole !== "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } })
        if (adminCount <= 1) {
            throw new Error("Cannot demote the last remaining active admin account")
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            role: newRole,
            sessionVersion: { increment: 1 },
        },
    })

    await writeAuditLog(session.user.id, "USER_ROLE_UPDATE", userId, {
        oldRole: target?.role,
        newRole,
        email: target?.email,
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
            provider: "RAZORPAY",
            providerId: `manual-${Date.now()}`,
            startDate,
            endDate,
        },
    })

    // Update user role to PREMIUM and increment sessionVersion
    await prisma.user.update({
        where: { id: userId },
        data: {
            role: "PREMIUM",
            sessionVersion: { increment: 1 },
        },
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
            status: "CANCELED",
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

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, email: true },
    })

    if (target?.role === "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } })
        if (adminCount <= 1) {
            throw new Error("Cannot delete the last remaining active admin account")
        }
    }

    await prisma.user.delete({
        where: { id: userId },
    })

    await writeAuditLog(session.user.id, "USER_DELETE", userId, { email: target?.email })

    revalidatePath("/admin/users")

    return { success: true, message: "User deleted successfully" }
}

// Activate or Deactivate (Block) user
export async function toggleUserActiveStatus(userId: string, isActive: boolean) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can manage user status")
    }

    if (userId === session.user.id && !isActive) {
        throw new Error("Cannot deactivate your own admin account")
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, email: true },
    })

    if (target?.role === "ADMIN" && !isActive) {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } })
        if (adminCount <= 1) {
            throw new Error("Cannot deactivate the last remaining active admin account")
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            isActive,
            sessionVersion: { increment: 1 }, // Invalidates all sessions immediately
        },
    })

    await writeAuditLog(session.user.id, isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE", userId, {
        email: target?.email,
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true, message: `User ${isActive ? "activated" : "deactivated"} successfully` }
}

// Trigger password reset email from admin console
export async function adminTriggerPasswordReset(userId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can trigger password resets")
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, isActive: true },
    })

    if (!user) {
        throw new Error("User not found")
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://127.0.0.1:3045"
    await sendPasswordResetEmail(user.email, appUrl)

    await writeAuditLog(session.user.id, "ADMIN_TRIGGER_PASSWORD_RESET", userId, { email: user.email })

    return { success: true, message: "Password reset link sent to user's email" }
}

// Trigger email verification from admin console
export async function adminResendVerification(userId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can resend verification emails")
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerified: true },
    })

    if (!user) {
        throw new Error("User not found")
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://127.0.0.1:3045"
    await sendVerificationEmail(user.email, appUrl)

    await writeAuditLog(session.user.id, "ADMIN_RESEND_VERIFICATION", userId, { email: user.email })

    return { success: true, message: "Verification link sent to user's email" }
}

// Soft delete / anonymize user
export async function anonymizeUser(userId: string) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can anonymize users")
    }

    if (userId === session.user.id) {
        throw new Error("Cannot anonymize your own admin account")
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, email: true },
    })

    if (target?.role === "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } })
        if (adminCount <= 1) {
            throw new Error("Cannot anonymize the last remaining active admin account")
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            name: "Anonymized User",
            email: `anonymized-${userId}@anonymized.trillionskill.local`,
            phoneNumber: null,
            password: null,
            isActive: false,
            sessionVersion: { increment: 1 },
        },
    })

    await writeAuditLog(session.user.id, "USER_ANONYMIZE", userId, { originalEmail: target?.email })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true, message: "User anonymized and deactivated successfully" }
}

// Export users as CSV
export async function exportUsersCsv(): Promise<string> {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can export user data")
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        // Bounded export: an unbounded findMany would materialise the whole
        // user table in memory.
        take: MAX_CSV_USERS,
        select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
        },
    })

    const header = "ID,Name,Email,Phone,Role,Status,Verified,JoinedAt\n"
    const rows = users
        .map((u) => {
            const name = csvCell(u.name || "")
            const email = csvCell(u.email)
            const phone = csvCell(u.phoneNumber || "")
            const role = csvCell(u.role)
            const status = u.isActive ? "ACTIVE" : "INACTIVE"
            const verified = u.emailVerified ? "YES" : "NO"
            const joined = u.createdAt.toISOString()
            return `"${csvCell(u.id)}","${name}","${email}","${phone}","${role}","${status}","${verified}","${joined}"`
        })
        .join("\n")

    await writeAuditLog(session.user.id, "USER_EXPORT_CSV", undefined, {
        count: users.length,
        cappedAt: MAX_CSV_USERS,
    })

    return header + rows
}

// Create new user (admin)
export async function createNewUserAdmin(data: {
    name: string
    email: string
    role?: "ADMIN" | "TEACHER" | "PREMIUM" | "FREE"
    phoneNumber?: string
    password?: string
}) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can create users")
    }

    const normalizedEmail = data.email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
        throw new Error("A user with this email address already exists")
    }

    const cleanPhone = data.phoneNumber && data.phoneNumber.trim().length === 10 ? data.phoneNumber.trim() : null
    if (cleanPhone) {
        const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: cleanPhone } })
        if (existingPhone) {
            throw new Error("A user with this phone number already exists")
        }
    }

    const rawPassword = data.password || "TempPass123!Safe"
    const hashedPassword = await bcrypt.hash(rawPassword, 12)

    const created = await prisma.user.create({
        data: {
            name: data.name.trim(),
            email: normalizedEmail,
            role: data.role || "FREE",
            phoneNumber: cleanPhone,
            password: hashedPassword,
            isActive: true,
            sessionVersion: 1,
        },
        omit: { password: true },
    })

    await writeAuditLog(session.user.id, "USER_CREATE", created.id, {
        email: normalizedEmail,
        role: created.role,
    })

    revalidatePath("/admin/users")

    return { success: true, user: created }
}

