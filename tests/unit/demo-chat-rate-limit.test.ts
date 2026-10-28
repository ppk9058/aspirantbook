import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

/**
 * B-018: the demo-chat rate limit used a process-local `Map`, so a client could
 * bypass it by landing on another serverless instance. The route now uses the
 * Postgres-backed limiter, which is shared by every instance.
 *
 * The cross-instance bug is invisible inside one process by definition, so this
 * test proves the two properties the fix relies on:
 *  1. the route no longer keeps per-process state, and
 *  2. the limiter's counters live in the database and are keyed per user.
 */
describe("Demo chat rate limit is shared, not process-local (B-018)", () => {
  const keyPrefix = `demo_chat_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  before(async () => {
    await prisma.$connect()
  })

  after(async () => {
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: keyPrefix } } })
    await prisma.$disconnect()
  })

  it("does not keep an in-memory rate limit map in the demo chat route", () => {
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "app/api/courses/demo/chat/route.ts"),
      "utf8"
    )

    assert.doesNotMatch(routeSource, /new Map</, "route must not keep a process-local Map")
    assert.doesNotMatch(routeSource, /lastPostTime/, "route must not keep lastPostTime state")
    assert.match(routeSource, /checkRateLimit\(/, "route must use the shared limiter")
  })

  it("counts requests in Postgres and rejects the second message inside the window", async () => {
    const key = `${keyPrefix}:user-a`

    const first = await checkRateLimit(key, 1, 60)
    assert.equal(first.allowed, true, "first message must be allowed")
    assert.equal(first.count, 1)

    const second = await checkRateLimit(key, 1, 60)
    assert.equal(second.allowed, false, "second message inside the window must be blocked")
    assert.equal(second.count, 2)

    // The counter is persisted, so any other instance reading the same key sees it.
    const stored = await prisma.rateLimit.findFirst({
      where: { key, count: { gte: 2 } },
      orderBy: { windowStart: "desc" },
    })
    assert.ok(stored, "the rate limit counter must be stored in the RateLimit table")
  })

  it("keeps limits per user", async () => {
    const userA = await checkRateLimit(`${keyPrefix}:user-a-2`, 1, 60)
    const userB = await checkRateLimit(`${keyPrefix}:user-b-2`, 1, 60)

    assert.equal(userA.allowed, true)
    assert.equal(userB.allowed, true, "a different user must not inherit another user's counter")
  })
})
