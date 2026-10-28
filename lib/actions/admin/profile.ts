"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { validatePasswordPolicy } from "@/lib/auth/password-policy"

/**
 * Fetch current admin profile details
 */
export async function getAdminProfile() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                createdAt: true,
                lastActive: true,
            },
        })

        if (!user) {
            return { success: false, error: "User not found" }
        }

        return { success: true, user }
    } catch (error: any) {
        console.error("Error getting admin profile:", error)
        return { success: false, error: error.message || "Failed to load profile" }
    }
}

/**
 * Update admin profile information (Name, Image)
 */
export async function updateAdminProfile(data: { name: string; image?: string | null }) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
            return { success: false, error: "Unauthorized" }
        }

        const trimmedName = data.name.trim()
        if (!trimmedName || trimmedName.length < 2) {
            return { success: false, error: "Name must be at least 2 characters" }
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: trimmedName,
                image: data.image !== undefined ? data.image : undefined,
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
            },
        })

        revalidatePath("/admin")
        revalidatePath("/admin/settings")
        revalidatePath("/profile")
        revalidatePath("/settings")

        return { success: true, user: updatedUser }
    } catch (error: any) {
        console.error("Error updating admin profile:", error)
        return { success: false, error: error.message || "Failed to update profile" }
    }
}

/**
 * Update admin account password
 */
export async function updateAdminPassword(data: {
    currentPassword?: string
    newPassword: string
    confirmPassword: string
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        if (data.newPassword !== data.confirmPassword) {
            return { success: false, error: "New passwords do not match" }
        }

        const policy = validatePasswordPolicy(data.newPassword)
        if (!policy.valid) {
            return { success: false, error: policy.error || "Password does not meet the security policy" }
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        })

        if (!user) {
            return { success: false, error: "User not found" }
        }

        // If user already has a password, verify current password
        if (user.password) {
            if (!data.currentPassword) {
                return { success: false, error: "Current password is required" }
            }
            const isMatch = await bcrypt.compare(data.currentPassword, user.password)
            if (!isMatch) {
                return { success: false, error: "Current password is incorrect" }
            }
        }

        // Hash new password (same cost as the rest of the auth paths)
        const hashedPassword = await bcrypt.hash(data.newPassword, 12)

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                password: hashedPassword,
                // Invalidate every existing session for this account.
                sessionVersion: { increment: 1 },
            },
        })

        return { success: true }
    } catch (error: any) {
        console.error("Error updating admin password:", error)
        return { success: false, error: error.message || "Failed to update password" }
    }
}
