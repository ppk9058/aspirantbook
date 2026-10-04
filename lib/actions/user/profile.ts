"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { hash, compare } from "bcryptjs"
import { deleteFromS3 } from "@/lib/aws-s3"

/**
 * Update user profile information
 */
export async function updateProfile(formData: FormData) {
    try {
        const session = await auth()
        if (!session) {
            return { success: false, error: "Not authenticated" }
        }

        const name = formData.get("name") as string
        const bio = formData.get("bio") as string | null

        if (!name || name.trim().length === 0) {
            return { success: false, error: "Name is required" }
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: name.trim(),
                bio: bio?.trim() || null,
            },
        })

        revalidatePath("/profile")
        revalidatePath("/settings")

        return { success: true }
    } catch (error) {
        console.error("Error updating profile:", error)
        return { success: false, error: "Failed to update profile" }
    }
}

/**
 * Update user avatar
 */
export async function updateAvatar(avatarUrl: string) {
    try {
        const session = await auth()
        if (!session) {
            return { success: false, error: "Not authenticated" }
        }

        // Get current user to delete old avatar
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { avatarUrl: true },
        })

        // Delete old avatar from S3 if exists
        if (user?.avatarUrl) {
            try {
                const key = user.avatarUrl.split(".com/")[1]
                if (key) await deleteFromS3(key)
            } catch (error) {
                console.error("Error deleting old avatar:", error)
            }
        }

        // Update with new avatar
        await prisma.user.update({
            where: { id: session.user.id },
            data: { avatarUrl },
        })

        revalidatePath("/profile")
        revalidatePath("/settings")

        return { success: true }
    } catch (error) {
        console.error("Error updating avatar:", error)
        return { success: false, error: "Failed to update avatar" }
    }
}

/**
 * Change user password
 */
export async function changePassword(formData: FormData) {
    try {
        const session = await auth()
        if (!session) {
            return { success: false, error: "Not authenticated" }
        }

        const currentPassword = formData.get("currentPassword") as string
        const newPassword = formData.get("newPassword") as string
        const confirmPassword = formData.get("confirmPassword") as string

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return { success: false, error: "All fields are required" }
        }

        if (newPassword !== confirmPassword) {
            return { success: false, error: "New passwords do not match" }
        }

        if (newPassword.length < 6) {
            return { success: false, error: "Password must be at least 6 characters" }
        }

        // Get current user with password
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        })

        if (!user?.password) {
            return { success: false, error: "User not found" }
        }

        // Verify current password
        const isValid = await compare(currentPassword, user.password)
        if (!isValid) {
            return { success: false, error: "Current password is incorrect" }
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, 12)

        // Update password
        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword },
        })

        return { success: true }
    } catch (error) {
        console.error("Error changing password:", error)
        return { success: false, error: "Failed to change password" }
    }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(preferences: {
    courseUpdates: boolean
    achievements: boolean
    weeklyReport: boolean
    marketing: boolean
}) {
    try {
        const session = await auth()
        if (!session) {
            return { success: false, error: "Not authenticated" }
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                notificationPrefs: preferences,
            },
        })

        revalidatePath("/settings")

        return { success: true }
    } catch (error) {
        console.error("Error updating preferences:", error)
        return { success: false, error: "Failed to update preferences" }
    }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(settings: {
    profileVisible: boolean
    showProgress: boolean
    showAchievements: boolean
}) {
    try {
        const session = await auth()
        if (!session) {
            return { success: false, error: "Not authenticated" }
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                privacySettings: settings,
            },
        })

        revalidatePath("/settings")

        return { success: true }
    } catch (error) {
        console.error("Error updating privacy settings:", error)
        return { success: false, error: "Failed to update privacy settings" }
    }
}

/**
 * Delete user account
 */
export async function deleteAccount(password: string) {
    try {
        const session = await auth()
        if (!session) {
            return { success: false, error: "Not authenticated" }
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true, avatarUrl: true },
        })

        if (!user?.password) {
            return { success: false, error: "User not found" }
        }

        // Verify password
        const isValid = await compare(password, user.password)
        if (!isValid) {
            return { success: false, error: "Incorrect password" }
        }

        // Delete avatar from S3 if exists
        if (user.avatarUrl) {
            try {
                const key = user.avatarUrl.split(".com/")[1]
                if (key) await deleteFromS3(key)
            } catch (error) {
                console.error("Error deleting avatar:", error)
            }
        }

        // Delete user (cascades to related data)
        await prisma.user.delete({
            where: { id: session.user.id },
        })

        return { success: true }
    } catch (error) {
        console.error("Error deleting account:", error)
        return { success: false, error: "Failed to delete account" }
    }
}
