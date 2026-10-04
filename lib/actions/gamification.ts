"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateLeaderboard, deleteCachePattern } from "@/lib/redis"
import { revalidatePath } from "next/cache"

export async function awardXP(userId: string, xpAmount: number, reason: string) {
    const session = await auth()

    if (!session) {
        throw new Error("Unauthorized")
    }

    // Update user XP in database
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            xp: {
                increment: xpAmount,
            },
        },
    })

    // Update leaderboard in Redis
    await updateLeaderboard(userId, user.xp)

    // Invalidate user cache
    await deleteCachePattern(`user:${userId}*`)

    // Create notification
    await prisma.notification.create({
        data: {
            userId,
            type: "ACHIEVEMENT",  // Using existing enum value
            title: `+${xpAmount} XP!`,
            message: reason,
            read: false,
        },
    })

    revalidatePath("/")
    revalidatePath("/leaderboard")

    return { success: true, newXP: user.xp, xpEarned: xpAmount }
}

export async function syncLeaderboard() {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Get all users with XP
    const users = await prisma.user.findMany({
        select: {
            id: true,
            xp: true,
        },
        where: {
            xp: {
                gt: 0,
            },
        },
    })

    // Update Redis leaderboard
    for (const user of users) {
        await updateLeaderboard(user.id, user.xp)
    }

    return { success: true, synced: users.length }
}
