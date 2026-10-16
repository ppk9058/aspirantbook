import dns from "dns"
import { promisify } from "util"

const reverseDns = promisify(dns.reverse)
const lookupDns = promisify(dns.lookup)

interface BotCacheEntry {
  verified: boolean
  expiresAt: number
}

// In-memory cache for IP verification (10 minutes TTL)
const ipVerificationCache = new Map<string, BotCacheEntry>()

// Simple rate limiter for bot verification per IP (max 60/minute)
const botRateLimits = new Map<string, { count: number; resetAt: number }>()

const KNOWN_BOT_DOMAINS = [
  /\.googlebot\.com$/i,
  /\.google\.com$/i,
  /\.search\.msn\.com$/i,
  /\.bing\.com$/i,
  /\.yandex\.(ru|net|com)$/i,
  /\.baidu\.(com|jp)$/i,
]

const BOT_USER_AGENTS = [
  /googlebot/i,
  /bingbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /duckduckbot/i,
]

/**
 * Checks if the request is from a legitimate, verified search engine crawler.
 * Requires both reverse DNS and forward DNS confirmation.
 * Never trusts User-Agent alone.
 */
export async function isVerifiedSearchEngineCrawler(
  inputOrUa: any,
  ip?: string | null
): Promise<boolean> {
  let userAgent: string | null = null
  let clientIp: string | null = null

  if (inputOrUa && typeof inputOrUa.get === "function") {
    userAgent = inputOrUa.get("user-agent") || inputOrUa.get("User-Agent")
    clientIp =
      inputOrUa.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      inputOrUa.get("x-real-ip") ||
      "127.0.0.1"
  } else if (typeof inputOrUa === "string") {
    userAgent = inputOrUa
    clientIp = ip || "127.0.0.1"
  }

  if (!userAgent || !clientIp) return false

  // 1. Check if User-Agent looks like a known search engine bot
  const uaMatch = BOT_USER_AGENTS.some((pattern) => pattern.test(userAgent!))
  if (!uaMatch) {
    return false
  }

  // 2. Test environment mock bypass (used for deterministic Playwright/unit testing)
  if (process.env.APP_ENV === "test" || process.env.NODE_ENV === "test") {
    if (clientIp === "127.0.0.2" || clientIp === "10.0.0.99" || userAgent.includes("VerifiedCrawlerMock")) {
      return true
    }
    // If it's localhost or an ordinary IP without the test mock signal, treat as normal user
    if (clientIp === "127.0.0.1" || clientIp === "::1") {
      return false
    }
  }

  // Normalize IP
  const cleanIp = clientIp.replace(/^::ffff:/, "").trim()
  if (!cleanIp || cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp.startsWith("192.168.") || cleanIp.startsWith("10.")) {
    return false
  }

  // 3. Check rate limiting for bot checks
  const now = Date.now()
  const rl = botRateLimits.get(cleanIp)
  if (rl) {
    if (now < rl.resetAt) {
      if (rl.count > 60) return false // Rate limit exceeded: fallback to preview
      rl.count++
    } else {
      botRateLimits.set(cleanIp, { count: 1, resetAt: now + 60000 })
    }
  } else {
    botRateLimits.set(cleanIp, { count: 1, resetAt: now + 60000 })
  }

  // 4. Check cached IP verification
  const cached = ipVerificationCache.get(cleanIp)
  if (cached && cached.expiresAt > now) {
    return cached.verified
  }

  // 5. Reverse DNS + Forward DNS verification
  try {
    const hostnames = await reverseDns(cleanIp)
    if (!hostnames || hostnames.length === 0) {
      ipVerificationCache.set(cleanIp, { verified: false, expiresAt: now + 600000 })
      return false
    }

    const hostname = hostnames[0]
    const matchesDomain = KNOWN_BOT_DOMAINS.some((regex) => regex.test(hostname))
    if (!matchesDomain) {
      ipVerificationCache.set(cleanIp, { verified: false, expiresAt: now + 600000 })
      return false
    }

    // Forward DNS check to confirm IP ownership
    const resolved = await lookupDns(hostname)
    const forwardMatches = resolved.address === cleanIp

    ipVerificationCache.set(cleanIp, { verified: forwardMatches, expiresAt: now + 600000 })
    return forwardMatches
  } catch {
    // On any DNS lookup failure or timeout, fall back to safe default (not verified)
    ipVerificationCache.set(cleanIp, { verified: false, expiresAt: now + 300000 })
    return false
  }
}
