"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { deleteFromS3 } from "@/lib/aws-s3"
import { validatePasswordPolicy } from "@/lib/auth/password-policy"

/**
 * Update user profile information (name, phone, selectedGoal)
 */
export async function updateProfile(formData: FormData) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const name = formData.get("name") as string
        const phoneNumber = formData.get("phoneNumber") as string | null
        const selectedGoal = formData.get("selectedGoal") as string | null

        if (!name || name.trim().length === 0) {
            return { success: false, error: "Name is required" }
        }

        const cleanPhone = phoneNumber && phoneNumber.trim().length === 10 ? phoneNumber.trim() : null

        // Check if phone number is already taken by another user
        if (cleanPhone) {
            const existingPhone = await prisma.user.findFirst({
                where: {
                    phoneNumber: cleanPhone,
                    id: { not: session.user.id },
                },
                select: { id: true },
            })
            if (existingPhone) {
                return { success: false, error: "Phone number is already associated with another account" }
            }
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: name.trim(),
                phoneNumber: cleanPhone,
                selectedGoal: selectedGoal?.trim() || null,
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
 * Update user avatar (image field)
 */
export async function updateAvatar(imageUrl: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        // Get current user to delete old avatar
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { image: true },
        })

        // Delete old avatar from S3 if exists
        if (user?.image && user.image.includes(".amazonaws.com/")) {
            try {
                const key = user.image.split(".com/")[1]
                if (key) await deleteFromS3(key)
            } catch (error) {
                console.error("Error deleting old avatar:", error)
            }
        }

        // Update with new avatar
        await prisma.user.update({
            where: { id: session.user.id },
            data: { image: imageUrl },
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
        if (!session?.user?.id) {
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

        // Enforce password policy
        const policyResult = validatePasswordPolicy(newPassword)
        if (!policyResult.valid) {
            return { success: false, error: policyResult.error }
        }

        // Get current user with password
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        })

        if (!user?.password) {
            return { success: false, error: "User account has no password set" }
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password)
        if (!isValid) {
            return { success: false, error: "Current password is incorrect" }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        // Update password and increment sessionVersion (revokes all active sessions)
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                password: hashedPassword,
                sessionVersion: { increment: 1 },
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        })

        return { success: true }
    } catch (error) {
        console.error("Error changing password:", error)
        return { success: false, error: "Failed to change password" }
    }
}

/**
 * Update notification preferences (stub for preferences stored in local client or settings)
 */
export async function updateNotificationPreferences(preferences: {
    courseUpdates: boolean
    achievements: boolean
    weeklyReport: boolean
    marketing: boolean
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

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
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        revalidatePath("/settings")
        return { success: true }
    } catch (error) {
        console.error("Error updating privacy settings:", error)
        return { success: false, error: "Failed to update privacy settings" }
    }
}

/**
 * Delete user account with password confirmation (soft delete / anonymize for data safety)
 */
export async function deleteAccount(password: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, email: true, password: true, image: true, role: true },
        })

        if (!user || !user.password) {
            return { success: false, error: "User not found or password not configured" }
        }

        // Protect last admin
        if (user.role === "ADMIN") {
            const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } })
            if (adminCount <= 1) {
                return { success: false, error: "Cannot delete the last remaining admin account" }
            }
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return { success: false, error: "Incorrect password" }
        }

        // Delete avatar from S3 if exists
        if (user.image && user.image.includes(".amazonaws.com/")) {
            try {
                const key = user.image.split(".com/")[1]
                if (key) await deleteFromS3(key)
            } catch (error) {
                console.error("Error deleting avatar:", error)
            }
        }

        // Deactivate and anonymize user to preserve historical progress and payment records safely
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                isActive: false,
                email: `deleted-${user.id}@anonymized.aspirantbook.local`,
                name: "Deleted User",
                phoneNumber: null,
                sessionVersion: { increment: 1 },
                password: null,
            },
        })

        // Log completion in DataDeletionRequest table
        await prisma.dataDeletionRequest.create({
            data: {
                userId: session.user.id,
                email: user.email,
                reason: "Authenticated in-app self-service deletion",
                status: "COMPLETED",
                processedAt: new Date(),
            },
        }).catch((err) => {
            console.error("Failed to log DataDeletionRequest record:", err)
        })

        return { success: true }
    } catch (error) {
        console.error("Error deleting account:", error)
        return { success: false, error: "Failed to delete account" }
    }
}
