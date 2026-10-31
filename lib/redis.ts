import Redis from 'ioredis'

// In-memory fallback stores when REDIS_URL is not configured
const memoryCache = new Map<string, { value: string; expiresAt: number }>()
const memoryLeaderboard = new Map<string, number>()
const memoryRateLimits = new Map<string, { count: number; resetAt: number }>()

const getRedisUrl = () => {
    return process.env.REDIS_URL || null
}

let warnedMissingRedis = false

/**
 * C2: with no REDIS_URL every helper below falls back to module-level Maps,
 * which are per process. On serverless that means the XP leaderboard and the
 * cached values are only correct within a single instance. That is a
 * deployment decision (set REDIS_URL), not something the code can fix, so it is
 * reported loudly once instead of failing silently.
 */
function warnIfRedisMissing() {
    if (warnedMissingRedis || getRedisUrl()) return
    if (process.env.NODE_ENV !== "production" && process.env.APP_ENV !== "test") return
    warnedMissingRedis = true
    console.warn(
        "[Redis] REDIS_URL is not set: leaderboard and cache helpers fall back to per-instance memory."
    )
}

class RedisClient {
    private static instance: Redis | null = null
    private static hasAttemptedConnect = false

    static getInstance(): Redis | null {
        const url = getRedisUrl()
        if (!url) {
            warnIfRedisMissing()
            return null
        }

        if (!RedisClient.instance && !RedisClient.hasAttemptedConnect) {
            RedisClient.hasAttemptedConnect = true
            try {
                RedisClient.instance = new Redis(url, {
                    lazyConnect: true,
                    enableOfflineQueue: false,
                    maxRetriesPerRequest: 1,
                    connectTimeout: 500,
                    retryStrategy(times) {
                        if (times > 1) return null
                        return 100
                    },
                    reconnectOnError(err) {
                        return err.message.includes('READONLY')
                    },
                })

                RedisClient.instance.on('error', (err) => {
                    // Log warning without flooding console
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn('[Redis] Connection warning:', err?.message || err)
                    }
                })

                RedisClient.instance.on('connect', () => {
                    console.info('[Redis] Connected successfully')
                })
            } catch (initErr) {
                console.warn('[Redis] Failed to initialize client:', initErr)
                RedisClient.instance = null
            }
        }

        return RedisClient.instance
    }

    static async disconnect() {
        if (RedisClient.instance) {
            try {
                await RedisClient.instance.quit()
            } catch {}
            RedisClient.instance = null
            RedisClient.hasAttemptedConnect = false
        }
    }
}

export const redis = RedisClient.getInstance()

// Cache helper functions
export async function getCached<T>(key: string): Promise<T | null> {
    const client = RedisClient.getInstance()
    if (client) {
        try {
            const cached = await client.get(key)
            return cached ? JSON.parse(cached) : null
        } catch {
            // Fall back to memory cache
        }
    }

    const item = memoryCache.get(key)
    if (!item) return null
    if (Date.now() > item.expiresAt) {
        memoryCache.delete(key)
        return null
    }
    try {
        return JSON.parse(item.value)
    } catch {
        return null
    }
}

export async function setCache(
    key: string,
    value: any,
    ttlSeconds: number = 1800 // 30 minutes default
): Promise<void> {
    const serialized = JSON.stringify(value)
    const client = RedisClient.getInstance()
    if (client) {
        try {
            await client.setex(key, ttlSeconds, serialized)
            return
        } catch {}
    }

    memoryCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttlSeconds * 1000,
    })
}

export async function deleteCache(key: string): Promise<void> {
    const client = RedisClient.getInstance()
    if (client) {
        try {
            await client.del(key)
        } catch {}
    }
    memoryCache.delete(key)
}

export async function deleteCachePattern(pattern: string): Promise<void> {
    const client = RedisClient.getInstance()
    if (client) {
        try {
            const keys = await client.keys(pattern)
            if (keys.length > 0) {
                await client.del(...keys)
            }
        } catch {}
    }

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    Array.from(memoryCache.keys()).forEach((k) => {
        if (regex.test(k)) {
            memoryCache.delete(k)
        }
    })
}

// Leaderboard functions
export async function updateLeaderboard(
    userId: string,
    xp: number
): Promise<void> {
    const client = RedisClient.getInstance()
    if (client) {
        try {
            await client.zadd('leaderboard:global', xp, userId)
            return
        } catch {}
    }

    memoryLeaderboard.set(userId, xp)
}

export async function getLeaderboard(
    limit: number = 100,
    offset: number = 0
): Promise<Array<{ userId: string; xp: number; rank: number }>> {
    const client = RedisClient.getInstance()
    if (client) {
        try {
            const results = await client.zrevrange(
                'leaderboard:global',
                offset,
                offset + limit - 1,
                'WITHSCORES'
            )

            const leaderboard: Array<{ userId: string; xp: number; rank: number }> = []
            for (let i = 0; i < results.length; i += 2) {
                leaderboard.push({
                    userId: results[i],
                    xp: parseInt(results[i + 1]),
                    rank: offset + i / 2 + 1,
                })
            }

            return leaderboard
        } catch {}
    }

    const sorted = Array.from(memoryLeaderboard.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(offset, offset + limit)

    return sorted.map(([userId, xp], idx) => ({
        userId,
        xp,
        rank: offset + idx + 1,
    }))
}

export async function getUserRank(userId: string): Promise<number | null> {
    const client = RedisClient.getInstance()
    if (client) {
        try {
            const rank = await client.zrevrank('leaderboard:global', userId)
            return rank !== null ? rank + 1 : null
        } catch {}
    }

    const sorted = Array.from(memoryLeaderboard.entries()).sort((a, b) => b[1] - a[1])
    const index = sorted.findIndex(([id]) => id === userId)
    return index !== -1 ? index + 1 : null
}

// Rate limiting
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
    const client = RedisClient.getInstance()
    if (client) {
        try {
            const current = await client.incr(key)
            if (current === 1) {
                await client.expire(key, windowSeconds)
            }
            const allowed = current <= limit
            const remaining = Math.max(0, limit - current)
            return { allowed, remaining }
        } catch {}
    }

    const now = Date.now()
    const record = memoryRateLimits.get(key)
    if (!record || now > record.resetAt) {
        memoryRateLimits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
        return { allowed: true, remaining: limit - 1 }
    }

    record.count++
    const allowed = record.count <= limit
    const remaining = Math.max(0, limit - record.count)
    return { allowed, remaining }
}

// Session storage
export async function setSession(
    sessionId: string,
    data: any,
    ttlSeconds: number = 604800 // 7 days
): Promise<void> {
    await setCache(`session:${sessionId}`, data, ttlSeconds)
}

export async function getSession(sessionId: string): Promise<any | null> {
    return getCached(`session:${sessionId}`)
}

export async function deleteSession(sessionId: string): Promise<void> {
    await deleteCache(`session:${sessionId}`)
}

export default redis
