import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { checkRateLimit, getClientIp, normalizeIp } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

/**
 * A16: client-IP derivation and the fail-closed limiter.
 *
 * Two defects are covered here:
 *  1. `getClientIp` returned 127.0.0.1 for every request unless TRUST_PROXY was
 *     set, so all clients shared one rate-limit bucket. When the proxy *was*
 *     trusted it used the left-most X-Forwarded-For entry, which the client
 *     controls, so an attacker could rotate buckets for free.
 *  2. `checkRateLimit` silently allowed every request when the database failed,
 *     including on login/OTP/payment/upload surfaces.
 */

function headers(init: Record<string, string>) {
  return { headers: new Headers(init) }
}

const ENV_KEYS = ["TRUST_PROXY", "TRUST_PROXY_HOPS"] as const

describe("A16 client IP derivation", () => {
  const saved: Record<string, string | undefined> = {}

  before(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key]
  })

  after(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it("ignores forwarded headers when no proxy is trusted", () => {
    delete process.env.TRUST_PROXY
    const ip = getClientIp(
      headers({ "x-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8" })
    )
    assert.equal(ip, "127.0.0.1")
  })

  it("takes the right-most trusted hop, not the client-supplied left entry", () => {
    process.env.TRUST_PROXY = "true"
    delete process.env.TRUST_PROXY_HOPS
    // Client sent "9.9.9.9"; the trusted proxy appended the real peer 5.6.7.8.
    const ip = getClientIp(headers({ "x-forwarded-for": "9.9.9.9, 5.6.7.8" }))
    assert.equal(ip, "5.6.7.8")
  })

  it("honours TRUST_PROXY_HOPS for multi-proxy deployments", () => {
    process.env.TRUST_PROXY = "true"
    process.env.TRUST_PROXY_HOPS = "2"
    const ip = getClientIp(
      headers({ "x-forwarded-for": "9.9.9.9, 203.0.113.7, 10.0.0.2" })
    )
    assert.equal(ip, "203.0.113.7")
  })

  it("rejects non-IP garbage instead of keying buckets on it", () => {
    process.env.TRUST_PROXY = "true"
    delete process.env.TRUST_PROXY_HOPS
    const ip = getClientIp(
      headers({ "x-forwarded-for": "not-an-ip, also-bad", "x-real-ip": "198.51.100.9" })
    )
    assert.equal(ip, "198.51.100.9")
  })

  it("normalises ports, brackets and IPv4-mapped IPv6", () => {
    assert.equal(normalizeIp("203.0.113.5:44321"), "203.0.113.5")
    assert.equal(normalizeIp("[2001:DB8::1]:443"), "2001:db8::1")
    assert.equal(normalizeIp("::ffff:192.0.2.44"), "192.0.2.44")
    assert.equal(normalizeIp(" 10.1.2.3 "), "10.1.2.3")
    assert.equal(normalizeIp("evil.example"), null)
    assert.equal(normalizeIp(""), null)
  })

  it("distinct client IPs produce distinct limiter buckets", async () => {
    process.env.TRUST_PROXY = "true"
    delete process.env.TRUST_PROXY_HOPS
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const ipA = getClientIp(headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.1" }))
    const ipB = getClientIp(headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.2" }))
    assert.notEqual(ipA, ipB)

    // Same spoofed prefix, different real peers: each gets its own counter.
    const a1 = await checkRateLimit(`a16:${suffix}:${ipA}`, 1, 60)
    const a2 = await checkRateLimit(`a16:${suffix}:${ipA}`, 1, 60)
    const b1 = await checkRateLimit(`a16:${suffix}:${ipB}`, 1, 60)
    assert.equal(a1.allowed, true)
    assert.equal(a2.allowed, false)
    assert.equal(b1.allowed, true)

    await prisma.rateLimit.deleteMany({ where: { key: { contains: suffix } } })
  })
})

describe("A16 fail-closed limiter", () => {
  const original = prisma.$queryRawUnsafe

  after(() => {
    prisma.$queryRawUnsafe = original
  })

  it("rejects when the database fails and failClosed is set", async () => {
    ;(prisma as any).$queryRawUnsafe = async () => {
      throw new Error("connection terminated")
    }
    const res = await checkRateLimit(`a16:failclosed:${Date.now()}`, 10, 60, {
      failClosed: true,
    })
    assert.equal(res.allowed, false)
  })

  it("still fails open for customer-facing flows by default", async () => {
    ;(prisma as any).$queryRawUnsafe = async () => {
      throw new Error("connection terminated")
    }
    const res = await checkRateLimit(`a16:failopen:${Date.now()}`, 10, 60)
    assert.equal(res.allowed, true)
  })
})
