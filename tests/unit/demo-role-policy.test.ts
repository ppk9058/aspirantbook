import assert from "node:assert/strict"
import { test, describe, beforeEach, afterEach } from "node:test"
import {
  isDemoModeEnabled,
  normalizeDemoRole,
} from "../../lib/auth/demo-role"

const ORIGINAL = {
  NODE_ENV: process.env.NODE_ENV,
  APP_ENV: process.env.APP_ENV,
  ENABLE_DEMO_ROLE: process.env.ENABLE_DEMO_ROLE,
}

function restore() {
  ;(process.env as any).NODE_ENV = ORIGINAL.NODE_ENV
  if (ORIGINAL.APP_ENV === undefined) delete process.env.APP_ENV
  else process.env.APP_ENV = ORIGINAL.APP_ENV
  if (ORIGINAL.ENABLE_DEMO_ROLE === undefined) delete process.env.ENABLE_DEMO_ROLE
  else process.env.ENABLE_DEMO_ROLE = ORIGINAL.ENABLE_DEMO_ROLE
}

describe("A1 demo-role policy", () => {
  beforeEach(restore)
  afterEach(restore)

  test("production build always ignores ts_demo_role, even in the test env", () => {
    ;(process.env as any).NODE_ENV = "production"
    process.env.APP_ENV = "test"
    process.env.ENABLE_DEMO_ROLE = "true"
    assert.equal(isDemoModeEnabled(), false)
    assert.equal(normalizeDemoRole("ADMIN"), undefined)
    assert.equal(normalizeDemoRole("TEACHER"), undefined)
  })

  test("test environment enables the demo role", () => {
    ;(process.env as any).NODE_ENV = "development"
    process.env.APP_ENV = "test"
    delete process.env.ENABLE_DEMO_ROLE
    assert.equal(isDemoModeEnabled(), true)
    assert.equal(normalizeDemoRole("ADMIN"), "ADMIN")
  })

  test("explicit demo flag enables the demo role outside test", () => {
    ;(process.env as any).NODE_ENV = "development"
    delete process.env.APP_ENV
    process.env.ENABLE_DEMO_ROLE = "true"
    assert.equal(normalizeDemoRole("TEACHER"), "TEACHER")
  })

  test("fails closed when nothing explicitly enables demo mode", () => {
    ;(process.env as any).NODE_ENV = "development"
    delete process.env.APP_ENV
    delete process.env.ENABLE_DEMO_ROLE
    assert.equal(isDemoModeEnabled(), false)
    assert.equal(normalizeDemoRole("ADMIN"), undefined)
  })

  test("rejects an unknown role value", () => {
    ;(process.env as any).NODE_ENV = "development"
    process.env.APP_ENV = "test"
    assert.equal(normalizeDemoRole("SUPERADMIN"), undefined)
  })
})

describe("A1 /api/auth/role is inert in production", () => {
  beforeEach(restore)
  afterEach(restore)

  test("POST returns 404 in production and never sets a cookie", async () => {
    ;(process.env as any).NODE_ENV = "production"
    const mod = await import("../../app/api/auth/role/route")
    const res = await mod.POST(
      new Request("http://127.0.0.1:3045/api/auth/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      }) as any
    )
    assert.equal(res.status, 404)
    const body = await res.json()
    assert.equal(body.success, undefined)
    assert.equal(res.headers.get("set-cookie"), null)
  })

  test("GET returns 404 in production", async () => {
    ;(process.env as any).NODE_ENV = "production"
    const mod = await import("../../app/api/auth/role/route")
    const res = await mod.GET()
    assert.equal(res.status, 404)
  })
})
