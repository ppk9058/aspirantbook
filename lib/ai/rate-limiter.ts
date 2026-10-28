import { prisma } from "../prisma"
import { AiProviderName } from "./types"
import { aiConfig } from "./config"

// In-memory fallback counters in case DB is unreachable
const memoryMinuteCounters = new Map<string, { count: number; expiresAt: number }>()
const memoryDayCounters = new Map<string, { count: number; expiresAt: number }>()

export class AiRateLimiter {
  /**
   * Checks whether the given provider has quota remaining in both
   * the current 1-minute window and the current daily window.
   * If allowed, increments counters and returns true.
   */
  public static async checkAndIncrement(
    provider: AiProviderName
  ): Promise<{ allowed: boolean; reason?: string }> {
    const config = aiConfig.providers[provider]
    if (!config) {
      return { allowed: false, reason: `Provider ${provider} not configured` }
    }

    const now = new Date()
    const currentMinuteBucket = Math.floor(now.getTime() / 60000)
    const currentDayStr = now.toISOString().slice(0, 10)

    const minuteKey = `${provider}:min:${currentMinuteBucket}`
    const dayKey = `${provider}:day:${currentDayStr}`

    const minuteExpiresAt = new Date((currentMinuteBucket + 1) * 60000 + 10000)
    const dayExpiresAt = new Date(now.getTime() + 86400000 * 2)

    try {
      // Run atomic increment in DB transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Minute counter
        const minuteCounter = await tx.aiRateLimitCounter.upsert({
          where: { key: minuteKey },
          update: { count: { increment: 1 } },
          create: {
            key: minuteKey,
            provider,
            windowType: "MINUTE",
            count: 1,
            expiresAt: minuteExpiresAt,
          },
        })

        // 2. Day counter
        const dayCounter = await tx.aiRateLimitCounter.upsert({
          where: { key: dayKey },
          update: { count: { increment: 1 } },
          create: {
            key: dayKey,
            provider,
            windowType: "DAY",
            count: 1,
            expiresAt: dayExpiresAt,
          },
        })

        // Check against limits
        if (minuteCounter.count > config.rpmLimit) {
          // Revert increment
          await tx.aiRateLimitCounter.update({
            where: { key: minuteKey },
            data: { count: { decrement: 1 } },
          })
          await tx.aiRateLimitCounter.update({
            where: { key: dayKey },
            data: { count: { decrement: 1 } },
          })
          return {
            allowed: false,
            reason: `RPM limit exceeded for ${provider} (${minuteCounter.count}/${config.rpmLimit})`,
          }
        }

        if (dayCounter.count > config.rpdLimit) {
          // Revert increment
          await tx.aiRateLimitCounter.update({
            where: { key: minuteKey },
            data: { count: { decrement: 1 } },
          })
          await tx.aiRateLimitCounter.update({
            where: { key: dayKey },
            data: { count: { decrement: 1 } },
          })
          return {
            allowed: false,
            reason: `Daily RPD quota exceeded for ${provider} (${dayCounter.count}/${config.rpdLimit})`,
          }
        }

        return { allowed: true }
      })

      return result
    } catch {
      // Fallback to in-memory rate limiting if database is unavailable
      return this.checkAndIncrementMemory(provider, config.rpmLimit, config.rpdLimit)
    }
  }

  private static checkAndIncrementMemory(
    provider: AiProviderName,
    rpmLimit: number,
    rpdLimit: number
  ): { allowed: boolean; reason?: string } {
    const now = Date.now()
    const minuteBucket = Math.floor(now / 60000)
    const dayBucket = new Date().toISOString().slice(0, 10)

    const minuteKey = `${provider}:min:${minuteBucket}`
    const dayKey = `${provider}:day:${dayBucket}`

    // Cleanup expired memory counters
    memoryMinuteCounters.forEach((v, k) => {
      if (v.expiresAt < now) memoryMinuteCounters.delete(k)
    })
    memoryDayCounters.forEach((v, k) => {
      if (v.expiresAt < now) memoryDayCounters.delete(k)
    })

    const minEntry = memoryMinuteCounters.get(minuteKey) || { count: 0, expiresAt: now + 70000 }
    const dayEntry = memoryDayCounters.get(dayKey) || { count: 0, expiresAt: now + 86400000 }

    if (minEntry.count >= rpmLimit) {
      return { allowed: false, reason: `Memory RPM limit reached for ${provider}` }
    }
    if (dayEntry.count >= rpdLimit) {
      return { allowed: false, reason: `Memory RPD limit reached for ${provider}` }
    }

    minEntry.count++
    dayEntry.count++
    memoryMinuteCounters.set(minuteKey, minEntry)
    memoryDayCounters.set(dayKey, dayEntry)

    return { allowed: true }
  }

  /**
   * Enforces student daily quota for doubt-solving.
   */
  public static async checkStudentDailyQuota(
    userId: string
  ): Promise<{ allowed: boolean; remaining: number; quota: number }> {
    const quota = aiConfig.studentDailyQuota
    const dayDate = new Date().toISOString().slice(0, 10)

    try {
      const record = await prisma.aiStudentQuota.findUnique({
        where: { userId_dayDate: { userId, dayDate } },
      })
      const current = record?.count || 0
      const remaining = Math.max(0, quota - current)
      return {
        allowed: current < quota,
        remaining,
        quota,
      }
    } catch {
      return { allowed: true, remaining: quota, quota }
    }
  }

  public static async incrementStudentDailyQuota(userId: string): Promise<number> {
    const dayDate = new Date().toISOString().slice(0, 10)
    try {
      const record = await prisma.aiStudentQuota.upsert({
        where: { userId_dayDate: { userId, dayDate } },
        update: { count: { increment: 1 } },
        create: {
          userId,
          dayDate,
          count: 1,
        },
      })
      return record.count
    } catch {
      return 1
    }
  }
}
