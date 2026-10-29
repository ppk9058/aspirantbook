import React from "react"
globalThis.React = React
import assert from "node:assert/strict"
import { test, describe, before, after } from "node:test"
import { NextRequest } from "next/server"

const PROD = { NODE_ENV: "production" } as NodeJS.ProcessEnv
const DEV = { NODE_ENV: "development" } as NodeJS.ProcessEnv
const TEST_ENV = { NODE_ENV: "development", APP_ENV: "test" } as NodeJS.ProcessEnv

const ENV_KEYS = [
  "NODE_ENV",
  "APP_ENV",
  "DEMO_MODE_ENABLED",
  "ENABLE_DEMO_ROLE",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
] as const
let snapshot: Record<string, string | undefined> = {}

const fakeEvent = { waitUntil: () => {}, passThroughOnException: () => {} } as any

function setEnv(key: string, value: string) {
  ;(process.env as Record<string, string | undefined>)[key] = value
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = snapshot[key]
    if (value === undefined) delete process.env[key]
    else (process.env as Record<string, string | undefined>)[key] = value
  }
}

async function loadDemoRoleModule(): Promise<any | null> {
  try {
    return await import("../../lib/auth/demo-role")
  } catch {
    return null
  }
}

describe("B-001 demo role guard", () => {
  before(() => {
    snapshot = {}
    for (const key of ENV_KEYS) snapshot[key] = process.env[key]
    // NextAuth middleware wrapper needs a secret even when no session exists.
    setEnv("AUTH_SECRET", "unit-test-secret-not-used-for-signing")
  })

  after(() => {
    restoreEnv()
  })

  test("production never resolves a demo role, even with every flag set", async () => {
    const mod = await loadDemoRoleModule()
    assert.ok(mod, "lib/auth/demo-role module must exist")
    assert.equal(
      mod.resolveDemoRole("ADMIN", { ...PROD, APP_ENV: "test", DEMO_MODE_ENABLED: "true" }),
      undefined
    )
    assert.equal(mod.isDemoRoleEnabled({ ...PROD, DEMO_MODE_ENABLED: "true" }), false)
  })

  test("development without explicit demo mode does not resolve a demo role", async () => {
    const mod = await loadDemoRoleModule()
    assert.ok(mod, "lib/auth/demo-role module must exist")
    assert.equal(mod.resolveDemoRole("ADMIN", DEV), undefined)
    assert.equal(mod.resolveDemoRole("ADMIN", { ...DEV, DEMO_MODE_ENABLED: "false" }), undefined)
  })

  test("demo mode works when explicitly enabled or in the test environment", async () => {
    const mod = await loadDemoRoleModule()
    assert.ok(mod, "lib/auth/demo-role module must exist")
    assert.equal(mod.resolveDemoRole("ADMIN", { ...DEV, DEMO_MODE_ENABLED: "true" }), "ADMIN")
    assert.equal(mod.resolveDemoRole("TEACHER", TEST_ENV), "TEACHER")
  })

  test("unknown cookie values are rejected", async () => {
    const mod = await loadDemoRoleModule()
    assert.ok(mod, "lib/auth/demo-role module must exist")
    assert.equal(mod.resolveDemoRole("SUPERADMIN", TEST_ENV), undefined)
    assert.equal(mod.resolveDemoRole("", TEST_ENV), undefined)
    assert.equal(mod.resolveDemoRole(undefined, TEST_ENV), undefined)
  })

  test("getDemoRole accepts a NextRequest and a next/headers cookie store", async () => {
    const mod = await loadDemoRoleModule()
    assert.ok(mod, "lib/auth/demo-role module must exist")
    try {
      setEnv("NODE_ENV", "development")
      setEnv("APP_ENV", "test")
      const req = new NextRequest("http://127.0.0.1:3045/admin", {
        headers: { cookie: "ts_demo_role=ADMIN" },
      })
      assert.equal(mod.getDemoRole(req), "ADMIN")

      const store = {
        get: (name: string) => (name === "ts_demo_role" ? { value: "TEACHER" } : undefined),
      }
      assert.equal(mod.getDemoRole(store), "TEACHER")
    } finally {
      restoreEnv()
    }
  })

  test("middleware rejects a demo ADMIN cookie in production for /admin and /api/admin", async () => {
    try {
      setEnv("NODE_ENV", "production")
      setEnv("AUTH_SECRET", "unit-test-secret-not-used-for-signing")
      delete process.env.DEMO_MODE_ENABLED
      delete process.env.ENABLE_DEMO_ROLE
      delete process.env.APP_ENV
      const { default: middleware } = await import("../../middleware")

      const pageRes = await middleware(
        new NextRequest("http://127.0.0.1:3045/admin/courses", {
          headers: { cookie: "ts_demo_role=ADMIN" },
        }),
        fakeEvent
      )
      assert.ok(pageRes, "middleware must return a redirect response blocking /admin")
      assert.equal(pageRes!.status, 307)
      assert.match(pageRes!.headers.get("location") || "", /\/login$/)

      const apiRes = await middleware(
        new NextRequest("http://127.0.0.1:3045/api/admin/courses", {
          headers: { cookie: "ts_demo_role=ADMIN" },
        }),
        fakeEvent
      )
      assert.ok(apiRes, "middleware must return a response blocking /api/admin")
      assert.equal(apiRes!.status, 401)
    } finally {
      restoreEnv()
    }
  })

  test("lib/auth/rbac.ts rejects ts_demo_role cookie in production", async () => {
    try {
      setEnv("NODE_ENV", "production")
      delete process.env.DEMO_MODE_ENABLED
      delete process.env.ENABLE_DEMO_ROLE
      delete process.env.APP_ENV

      const nextHeaders = require("next/headers")
      const authModule = require("../../auth")
      const mockCookies = {
        get: (name: string) => (name === "ts_demo_role" ? { value: "ADMIN" } : undefined),
      }

      require.cache[require.resolve("next/headers")]!.exports = {
        ...nextHeaders,
        cookies: async () => mockCookies,
        headers: async () => ({ get: () => "" }),
      }
      require.cache[require.resolve("../../auth")]!.exports = {
        ...authModule,
        auth: async () => null,
      }

      const { getCurrentUserContext } = await import("../../lib/auth/rbac")
      const ctx = await getCurrentUserContext()
      assert.notEqual(ctx.role, "ADMIN", "Production rbac must NOT grant ADMIN role from cookie")
      assert.equal(ctx.isAuthenticated, false, "Anonymous user with demo cookie must NOT be authenticated in production")
    } finally {
      restoreEnv()
    }
  })

  test("app/admin/layout.tsx rejects ts_demo_role cookie in production", async () => {
    try {
      setEnv("NODE_ENV", "production")
      delete process.env.DEMO_MODE_ENABLED
      delete process.env.ENABLE_DEMO_ROLE
      delete process.env.APP_ENV

      const nextHeaders = require("next/headers")
      const authModule = require("../../auth")
      const mockCookies = {
        get: (name: string) => (name === "ts_demo_role" ? { value: "ADMIN" } : undefined),
      }

      require.cache[require.resolve("next/headers")]!.exports = {
        ...nextHeaders,
        cookies: async () => mockCookies,
        headers: async () => ({ get: () => "" }),
      }
      require.cache[require.resolve("../../auth")]!.exports = {
        ...authModule,
        auth: async () => null,
      }

      const AdminLayout = (await import("../../app/admin/layout")).default
      let redirected = false
      let redirectTarget = ""
      try {
        await AdminLayout({ children: "admin-secret-content" as any })
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) {
          redirected = true
          redirectTarget = err.digest
        } else {
          throw err
        }
      }

      assert.equal(redirected, true, "AdminLayout must redirect unauthorized user in production")
      assert.match(redirectTarget, /;\/;307;/, "AdminLayout must redirect to /")
    } finally {
      restoreEnv()
    }
  })

  test("middleware still honours the demo flow in the test environment", async () => {
    try {
      setEnv("NODE_ENV", "development")
      setEnv("APP_ENV", "test")
      setEnv("AUTH_SECRET", "unit-test-secret-not-used-for-signing")
      const { default: middleware } = await import("../../middleware")

      const res = await middleware(
        new NextRequest("http://127.0.0.1:3045/admin/courses", {
          headers: { cookie: "ts_demo_role=ADMIN" },
        }),
        fakeEvent
      )
      assert.equal(
        res?.headers.get("location"),
        null,
        "demo ADMIN is not redirected away from /admin in the test environment"
      )
    } finally {
      restoreEnv()
    }
  })

  test("app/api/auth/role GET and POST return 404 in production", async () => {
    try {
      setEnv("NODE_ENV", "production")
      delete process.env.DEMO_MODE_ENABLED
      delete process.env.ENABLE_DEMO_ROLE
      delete process.env.APP_ENV

      const { GET, POST } = await import("../../app/api/auth/role/route")
      const getRes = await GET()
      assert.equal(getRes.status, 404, "GET /api/auth/role must return 404 in production")

      const postReq = new NextRequest("http://127.0.0.1:3045/api/auth/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      })
      const postRes = await POST(postReq)
      assert.equal(postRes.status, 404, "POST /api/auth/role must return 404 in production")
    } finally {
      restoreEnv()
    }
  })

  test("app/(dashboard)/admin/layout.tsx rejects ts_demo_role cookie in production", async () => {
    try {
      setEnv("NODE_ENV", "production")
      delete process.env.DEMO_MODE_ENABLED
      delete process.env.ENABLE_DEMO_ROLE
      delete process.env.APP_ENV

      const nextHeaders = require("next/headers")
      const authModule = require("../../auth")
      const mockCookies = {
        get: (name: string) => (name === "ts_demo_role" ? { value: "ADMIN" } : undefined),
      }

      require.cache[require.resolve("next/headers")]!.exports = {
        ...nextHeaders,
        cookies: async () => mockCookies,
        headers: async () => ({ get: () => "" }),
      }
      require.cache[require.resolve("../../auth")]!.exports = {
        ...authModule,
        auth: async () => null,
      }

      const DashboardAdminLayout = (await import("../../app/(dashboard)/admin/layout")).default
      let redirected = false
      let redirectTarget = ""
      try {
        await DashboardAdminLayout({ children: "admin-secret-content" as any })
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) {
          redirected = true
          redirectTarget = err.digest
        } else {
          throw err
        }
      }

      assert.equal(redirected, true, "DashboardAdminLayout must redirect unauthorized user in production")
      assert.match(redirectTarget, /;\/;307;/, "DashboardAdminLayout must redirect to /")
    } finally {
      restoreEnv()
    }
  })

  test("exam API route rejects ts_demo_role=ADMIN in production with 401", async () => {
    try {
      setEnv("NODE_ENV", "production")
      delete process.env.DEMO_MODE_ENABLED
      delete process.env.ENABLE_DEMO_ROLE
      delete process.env.APP_ENV

      const nextHeaders = require("next/headers")
      const authModule = require("../../auth")
      const mockCookies = {
        get: (name: string) => (name === "ts_demo_role" ? { value: "ADMIN" } : undefined),
      }

      require.cache[require.resolve("next/headers")]!.exports = {
        ...nextHeaders,
        cookies: async () => mockCookies,
        headers: async () => ({ get: () => "" }),
      }
      require.cache[require.resolve("../../auth")]!.exports = {
        ...authModule,
        auth: async () => null,
      }

      const { POST: bulkPost } = await import("../../app/api/exam/test/bulk/route")
      const req = new NextRequest("http://127.0.0.1:3045/api/exam/test/bulk", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "ts_demo_role=ADMIN",
        },
        body: JSON.stringify({ testIds: ["test-1"], action: "archive" }),
      })
      const res = await bulkPost(req)
      assert.ok([401, 403].includes(res.status), `Expected 401 or 403, got ${res.status}`)
    } finally {
      restoreEnv()
    }
  })
})
