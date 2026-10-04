import Redis from 'ioredis'

// Create Redis client
const getRedisUrl = () => {
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL
    }

    // Default to local Redis for development
    return 'redis://localhost:6379'
}

// Singleton pattern for Redis client
class RedisClient {
    private static instance: Redis | null = null

    static getInstance(): Redis {
        if (!RedisClient.instance) {
            RedisClient.instance = new Redis(getRedisUrl(), {
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    const delay = Math.min(times * 50, 2000)
                    return delay
                },
                reconnectOnError(err) {
                    const targetError = 'READONLY'
                    if (err.message.includes(targetError)) {
                        // Reconnect on READONLY errors
                        return true
                    }
                    return false
                },
            })

            RedisClient.instance.on('error', (err) => {
                console.error('Redis Client Error:', err)
            })

            RedisClient.instance.on('connect', () => {
                console.log('Redis Client Connected')
            })
        }

        return RedisClient.instance
    }

    static async disconnect() {
        if (RedisClient.instance) {
            await RedisClient.instance.quit()
            RedisClient.instance = null
        }
    }
}

export const redis = RedisClient.getInstance()

// Cache helper functions
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const cached = await redis.get(key)
        return cached ? JSON.parse(cached) : null
    } catch (error) {
        console.error('Redis get error:', error)
        return null
    }
}

export async function setCache(
    key: string,
    value: any,
    ttlSeconds: number = 1800 // 30 minutes default
): Promise<void> {
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
        console.error('Redis set error:', error)
    }
}

export async function deleteCache(key: string): Promise<void> {
    try {
        await redis.del(key)
    } catch (error) {
        console.error('Redis delete error:', error)
    }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
    try {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
            await redis.del(...keys)
        }
    } catch (error) {
        console.error('Redis delete pattern error:', error)
    }
}

// Leaderboard functions using Redis Sorted Sets
export async function updateLeaderboard(
    userId: string,
    xp: number
): Promise<void> {
    try {
        await redis.zadd('leaderboard:global', xp, userId)
    } catch (error) {
        console.error('Redis leaderboard update error:', error)
    }
}

export async function getLeaderboard(
    limit: number = 100,
    offset: number = 0
): Promise<Array<{ userId: string; xp: number; rank: number }>> {
    try {
        const results = await redis.zrevrange(
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
    } catch (error) {
        console.error('Redis leaderboard get error:', error)
        return []
    }
}

export async function getUserRank(userId: string): Promise<number | null> {
    try {
        const rank = await redis.zrevrank('leaderboard:global', userId)
        return rank !== null ? rank + 1 : null
    } catch (error) {
        console.error('Redis get rank error:', error)
        return null
    }
}

// Rate limiting
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
    try {
        const current = await redis.incr(key)

        if (current === 1) {
            // First request, set expiry
            await redis.expire(key, windowSeconds)
        }

        const allowed = current <= limit
        const remaining = Math.max(0, limit - current)

        return { allowed, remaining }
    } catch (error) {
        console.error('Redis rate limit error:', error)
        // Allow request on error
        return { allowed: true, remaining: limit }
    }
}

// Session storage
export async function setSession(
    sessionId: string,
    data: any,
    ttlSeconds: number = 604800 // 7 days
): Promise<void> {
    try {
        await redis.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data))
    } catch (error) {
        console.error('Redis session set error:', error)
    }
}

export async function getSession(sessionId: string): Promise<any | null> {
    try {
        const session = await redis.get(`session:${sessionId}`)
        return session ? JSON.parse(session) : null
    } catch (error) {
        console.error('Redis session get error:', error)
        return null
    }
}

export async function deleteSession(sessionId: string): Promise<void> {
    try {
        await redis.del(`session:${sessionId}`)
    } catch (error) {
        console.error('Redis session delete error:', error)
    }
}

export default redis
