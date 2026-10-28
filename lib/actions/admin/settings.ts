"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { PlatformSettings, defaultSettings } from "@/types/platform-settings"
import {
    getPlatformSetting,
    setPlatformSetting,
    updatePlatformSettingAtomic,
    PLATFORM_SETTING_KEYS,
} from "@/lib/platform-settings"

// S5: platform settings used to be written to data/platform-settings.json with
// fs.writeFileSync. That file is per-instance on serverless, so an admin change
// was invisible to the instance serving the next request. They now live in the
// PlatformSetting table (key "admin-settings").

async function readStoredSettings(): Promise<PlatformSettings> {
    // B1: a read error must surface. Falling back to defaults here meant the
    // next save persisted defaults and erased the admin's stored settings.
    const stored = await getPlatformSetting<Partial<PlatformSettings>>(
        PLATFORM_SETTING_KEYS.adminSettings
    )
    if (stored && typeof stored === "object") {
        return { ...defaultSettings, ...stored }
    }
    return defaultSettings
}

async function writeStoredSettings(settings: PlatformSettings): Promise<void> {
    await setPlatformSetting(PLATFORM_SETTING_KEYS.adminSettings, settings)
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
    const session = await auth()
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        throw new Error("Unauthorized: Admin access required")
    }
    return await readStoredSettings()
}

export async function updatePlatformSettings(data: Partial<PlatformSettings>) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized: Only Admins can modify platform settings." }
    }

    try {
        // B1: merge under a lock so two admins saving at once cannot drop each
        // other's fields (and a read error aborts instead of wiping).
        const merged = await updatePlatformSettingAtomic<PlatformSettings>(
            PLATFORM_SETTING_KEYS.adminSettings,
            (current) => {
                const base: PlatformSettings = {
                    ...defaultSettings,
                    ...(current && typeof current === "object" ? current : {}),
                }
                return {
                    ...base,
                    ...data,
                    announcement: {
                        ...base.announcement,
                        ...(data.announcement || {}),
                    },
                }
            },
            session.user.id
        )

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
        await writeStoredSettings(defaultSettings)
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
