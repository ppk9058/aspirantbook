"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import fs from "fs"
import path from "path"

import { PlatformSettings, defaultSettings } from "@/types/platform-settings"

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "platform-settings.json")

function readStoredSettings(): PlatformSettings {
    try {
        if (fs.existsSync(SETTINGS_FILE_PATH)) {
            const fileData = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8")
            const parsed = JSON.parse(fileData)
            return { ...defaultSettings, ...parsed }
        }
    } catch (err) {
        console.error("Error reading settings file, falling back to defaults:", err)
    }
    return defaultSettings
}

function writeStoredSettings(settings: PlatformSettings) {
    try {
        const dir = path.dirname(SETTINGS_FILE_PATH)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8")
    } catch (err) {
        console.error("Error writing settings file:", err)
        throw new Error("Failed to persist platform settings to disk")
    }
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
    const session = await auth()
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        throw new Error("Unauthorized: Admin access required")
    }
    return readStoredSettings()
}

export async function updatePlatformSettings(data: Partial<PlatformSettings>) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized: Only Admins can modify platform settings." }
    }

    try {
        const current = readStoredSettings()
        const merged: PlatformSettings = {
            ...current,
            ...data,
            announcement: {
                ...current.announcement,
                ...(data.announcement || {}),
            },
        }

        writeStoredSettings(merged)

        // Revalidate core paths
        revalidatePath("/admin/settings")
        revalidatePath("/admin")
        revalidatePath("/")

        return { success: true, settings: merged }
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to update settings" }
    }
}

export async function resetPlatformSettings() {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized: Admin access required" }
    }

    try {
        writeStoredSettings(defaultSettings)
        revalidatePath("/admin/settings")
        revalidatePath("/admin")
        revalidatePath("/")
        return { success: true, settings: defaultSettings }
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to reset settings" }
    }
}

export async function purgeSystemCache() {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        revalidatePath("/", "layout")
        return { success: true, message: "System application cache revalidated successfully." }
    } catch (err: any) {
        return { success: false, error: err.message || "Cache purge failed" }
    }
}

export async function getSystemDiagnostics() {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    let dbStatus = "Checking..."
    let dbLatencyMs = 0
    const start = Date.now()
    try {
        await prisma.$queryRaw`SELECT 1`
        dbLatencyMs = Date.now() - start
        dbStatus = "Connected (Healthy)"
    } catch (err: any) {
        dbStatus = `Disconnected (${err.message?.substring(0, 50) || "Error"})`
    }

    const s3Configured = Boolean(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_S3_BUCKET_NAME
    )

    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY)
    const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY)
    const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

    return {
        dbStatus,
        dbLatencyMs,
        s3Configured,
        geminiConfigured,
        stripeConfigured,
        razorpayConfigured,
        nodeEnv: process.env.NODE_ENV || "development",
        nextVersion: "15.1.4",
        timestamp: new Date().toISOString(),
    }
}
