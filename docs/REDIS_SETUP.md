# Redis Setup Guide

## Local Development

### Install Redis

**macOS (using Homebrew)**:
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian**:
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**Windows**:
Download from https://redis.io/download or use WSL

### Configure Environment

Add to your `.env.local`:
```
REDIS_URL=redis://localhost:6379
```

### Verify Connection

```bash
redis-cli ping
# Should return: PONG
```

## Production Deployment

### Option 1: Upstash Redis (Recommended for Vercel)

1. Sign up at https://upstash.com
2. Create a new Redis database
3. Copy the connection string
4. Add to your production environment variables:
```
REDIS_URL=rediss://default:your-password@your-redis-url.upstash.io:6379
```

### Option 2: Redis Cloud

1. Sign up at https://redis.com/try-free
2. Create a new database
3. Get connection details
4. Add to environment:
```
REDIS_URL=redis://default:password@redis-xxxxx.cloud.redislabs.com:12345
```

### Option 3: AWS ElastiCache

1. Create ElastiCache Redis cluster
2. Get endpoint
3. Add to environment:
```
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
```

## Usage in Code

The Redis client is automatically configured and available:

```typescript
import { redis, getCached, setCache, updateLeaderboard } from '@/lib/redis'

// Cache course data
const course = await getCached<Course>(`course:${courseId}`)
if (!course) {
  const freshCourse = await prisma.course.findUnique({ where: { id: courseId } })
  await setCache(`course:${courseId}`, freshCourse, 1800) // 30 min TTL
}

// Update leaderboard
await updateLeaderboard(userId, userXP)

// Get top 100 users
const leaderboard = await getLeaderboard(100)
```

## Features Implemented

- ✅ API response caching
- ✅ Session storage
- ✅ Leaderboard (sorted sets)
- ✅ Rate limiting
- ✅ Automatic reconnection
- ✅ Error handling

## Monitoring

Check Redis status:
```bash
redis-cli info stats
redis-cli info memory
```

View keys:
```bash
redis-cli keys "*"
```

Monitor commands:
```bash
redis-cli monitor
```
