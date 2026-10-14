import { prisma } from "@/lib/prisma"

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_WINDOW_SECONDS = 15 * 60 // 15 minutes

export interface LockoutStatus {
    isLocked: boolean
    remainingAttempts: number
    lockoutExpiresAt?: Date
}

export async function checkLoginLockout(email: string, ip: string): Promise<LockoutStatus> {
    const normalizedEmail = email.trim().toLowerCase()
    const now = new Date()

    // 1. Check user model lockedUntil
    try {
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { lockedUntil: true, failedLoginAttempts: true },
        })

        if (user?.lockedUntil && user.lockedUntil > now) {
            return {
                isLocked: true,
                remainingAttempts: 0,
                lockoutExpiresAt: user.lockedUntil,
            }
        }
    } catch (e) {
        console.error("[RateLimiter] Error checking user lockout:", e)
    }

    // 2. Check RateLimit table
    try {
        const windowStartMs = Math.floor(Date.now() / (LOCKOUT_WINDOW_SECONDS * 1000)) * (LOCKOUT_WINDOW_SECONDS * 1000)
        const windowStartDate = new Date(windowStartMs)
        const key = `login_fail:${normalizedEmail}:${ip}`

        const record = await prisma.rateLimit.findUnique({
            where: {
                key_windowStart: {
                    key,
                    windowStart: windowStartDate,
                },
            },
        })

        const failedCount = record?.count ?? 0
        if (failedCount >= MAX_FAILED_ATTEMPTS) {
            const expiresAt = new Date(windowStartMs + LOCKOUT_WINDOW_SECONDS * 1000)
            return {
                isLocked: true,
                remainingAttempts: 0,
                lockoutExpiresAt: expiresAt,
            }
        }

        return {
            isLocked: false,
            remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - failedCount),
        }
    } catch (e) {
        console.error("[RateLimiter] Error checking rate limit table:", e)
        return { isLocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS }
    }
}

export async function recordFailedLoginAttempt(email: string, ip: string): Promise<LockoutStatus> {
    const normalizedEmail = email.trim().toLowerCase()
    const windowStartMs = Math.floor(Date.now() / (LOCKOUT_WINDOW_SECONDS * 1000)) * (LOCKOUT_WINDOW_SECONDS * 1000)
    const windowStartDate = new Date(windowStartMs)
    const key = `login_fail:${normalizedEmail}:${ip}`
    const id = `${key}_${windowStartMs}`

    try {
        const res: any[] = await prisma.$queryRawUnsafe(
            `
            INSERT INTO "RateLimit" (id, key, "windowStart", count)
            VALUES ($1, $2, $3, 1)
            ON CONFLICT (key, "windowStart")
            DO UPDATE SET count = "RateLimit".count + 1
            RETURNING count;
            `,
            id,
            key,
            windowStartDate
        )

        const count = Number(res[0]?.count ?? 1)
        const isLocked = count >= MAX_FAILED_ATTEMPTS
        const lockoutExpiresAt = isLocked ? new Date(Date.now() + LOCKOUT_WINDOW_SECONDS * 1000) : undefined

        // Update user record if exists
        await prisma.user.updateMany({
            where: { email: normalizedEmail },
            data: {
                failedLoginAttempts: count,
                ...(isLocked ? { lockedUntil: lockoutExpiresAt } : {}),
            },
        }).catch(() => {})

        return {
            isLocked,
            remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - count),
            lockoutExpiresAt,
        }
    } catch (e) {
        console.error("[RateLimiter] Error recording failed attempt:", e)
        return { isLocked: false, remainingAttempts: 1 }
    }
}

export async function clearLoginLockout(email: string, ip: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    const key = `login_fail:${normalizedEmail}:${ip}`

    try {
        await prisma.rateLimit.deleteMany({
            where: { key },
        }).catch(() => {})

        await prisma.user.updateMany({
            where: { email: normalizedEmail },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        }).catch(() => {})
    } catch (e) {
        console.error("[RateLimiter] Error clearing lockout:", e)
    }
}
