import { test, expect } from "@playwright/test"

/**
 * A16: rate-limit buckets must follow the real client, not a shared constant.
 *
 * Before this change `getClientIp` returned 127.0.0.1 for every request unless
 * TRUST_PROXY was set, so every client shared one bucket (one abuser could lock
 * everyone out, and per-IP limits were meaningless). These tests run the real
 * server with TRUST_PROXY=true + TRUST_PROXY_HOPS=1 and drive /api/v1/auth/login
 * from different client IPs.
 */

const LOGIN_LIMIT_PER_MINUTE = 10

function forwardedFor(realIp: string, spoofed = "9.9.9.9") {
  // The client-supplied prefix is arbitrary; the trusted proxy appends the peer.
  return `${spoofed}, ${realIp}`
}

async function loginFrom(
  request: import("@playwright/test").APIRequestContext,
  realIp: string,
  spoofed?: string,
  attempt = 0
) {
  // A unique account per attempt keeps the per-account lockout (A13) out of the
  // picture so the assertion is purely about the per-IP bucket.
  return request.post("/api/v1/auth/login", {
    headers: {
      "x-forwarded-for": forwardedFor(realIp, spoofed),
      "x-real-ip": realIp,
    },
    data: {
      email: `nobody-a16-${Date.now()}-${attempt}@example.test`,
      password: "wrong-password-123",
    },
  })
}

test.describe("A16 per-client rate limiting", () => {
  test("one busy client does not exhaust another client's bucket", async ({ request }) => {
    const busyIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`
    const quietIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`

    const statuses: number[] = []
    for (let i = 0; i < LOGIN_LIMIT_PER_MINUTE + 1; i++) {
      const res = await loginFrom(request, busyIp, undefined, i)
      statuses.push(res.status())
    }

    // The busy client is throttled once the window is full.
    expect(statuses.slice(0, LOGIN_LIMIT_PER_MINUTE)).toEqual(
      new Array(LOGIN_LIMIT_PER_MINUTE).fill(401)
    )
    expect(statuses[LOGIN_LIMIT_PER_MINUTE]).toBe(429)

    // A different client is untouched — this is the bug's visible effect.
    const quiet = await loginFrom(request, quietIp, undefined, 0)
    expect(quiet.status(), await quiet.text()).toBe(401)
  })

  test("a spoofed X-Forwarded-For prefix does not create a fresh bucket", async ({ request }) => {
    const realIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`

    const statuses: number[] = []
    for (let i = 0; i < LOGIN_LIMIT_PER_MINUTE + 1; i++) {
      // Rotate the attacker-controlled first entry every time.
      const res = await loginFrom(request, realIp, `10.0.0.${i + 1}`, i)
      statuses.push(res.status())
    }

    expect(statuses[LOGIN_LIMIT_PER_MINUTE]).toBe(429)
  })
})
