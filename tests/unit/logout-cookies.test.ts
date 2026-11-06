import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { NextRequest } from "next/server"
import { POST } from "../../app/api/auth/logout/route"

const EXPECTED_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "next-auth.callback-url",
  "ts_demo_role",
]

describe("logout cookie clearance", () => {
  test("clears all cookies with expired Set-Cookie headers over HTTPS", async () => {
    const req = new NextRequest("https://aspirantbook.com/api/auth/logout", {
      method: "POST",
    })
    const res = await POST(req)

    assert.equal(res.status, 307)
    const setCookies = res.headers.getSetCookie()
    assert.equal(setCookies.length, EXPECTED_COOKIES.length)

    // Parse each Set-Cookie header into a lookup
    const cookieMap = new Map<string, string>()
    for (const sc of setCookies) {
      const name = sc.split("=")[0].trim()
      assert.equal(cookieMap.has(name), false, `Duplicate Set-Cookie found for ${name}`)
      cookieMap.set(name, sc)
    }

    for (const name of EXPECTED_COOKIES) {
      assert.ok(cookieMap.has(name), `Missing Set-Cookie header for ${name}`)
      const header = cookieMap.get(name)!

      // Assert expired: Max-Age=0, Expires=Thu, 01 Jan 1970
      assert.match(header, /Max-Age=0/i, `${name} must have Max-Age=0`)
      assert.match(header, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i, `${name} must have epoch expiry`)
      assert.match(header, /Path=\//i, `${name} must have Path=/`)
      assert.match(header, /SameSite=lax/i, `${name} must have SameSite=lax`)
      assert.match(header, /HttpOnly/i, `${name} must have HttpOnly`)

      // Over HTTPS, all cookies carry Secure
      assert.match(header, /Secure/i, `${name} must have Secure over HTTPS`)
    }

    // Explicitly verify __Secure-authjs.session-token and __Host-authjs.csrf-token carry Secure
    const secureSession = cookieMap.get("__Secure-authjs.session-token")!
    assert.match(secureSession, /; Secure(;|$)/i)

    const hostCsrf = cookieMap.get("__Host-authjs.csrf-token")!
    assert.match(hostCsrf, /; Secure(;|$)/i)
    // __Host- cookies must have Path=/ and NO Domain attribute
    assert.match(hostCsrf, /Path=\//i)
    assert.equal(/Domain=/i.test(hostCsrf), false, "__Host- cookie must not have Domain attribute")
  })

  test("always marks __Secure- and __Host- cookies as Secure even on HTTP", async () => {
    const originalEnv = process.env.NODE_ENV
    try {
      (process.env as any).NODE_ENV = "development"
      const req = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
      })
      const res = await POST(req)
      const setCookies = res.headers.getSetCookie()
      const cookieMap = new Map<string, string>()
      for (const sc of setCookies) {
        cookieMap.set(sc.split("=")[0].trim(), sc)
      }

      // __Secure- and __Host- must STILL be Secure
      assert.match(cookieMap.get("__Secure-authjs.session-token")!, /; Secure(;|$)/i)
      assert.match(cookieMap.get("__Host-authjs.csrf-token")!, /; Secure(;|$)/i)
      assert.match(cookieMap.get("__Secure-authjs.callback-url")!, /; Secure(;|$)/i)
      assert.match(cookieMap.get("__Secure-next-auth.session-token")!, /; Secure(;|$)/i)

      // Plain cookies without prefix on HTTP are not forced to Secure
      assert.equal(/; Secure(;|$)/i.test(cookieMap.get("authjs.session-token")!), false)
      assert.equal(/; Secure(;|$)/i.test(cookieMap.get("ts_demo_role")!), false)
    } finally {
      (process.env as any).NODE_ENV = originalEnv
    }
  })
})
