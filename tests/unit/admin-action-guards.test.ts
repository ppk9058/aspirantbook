import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { assertAdmin, assertRole } from "../../lib/auth/action-guards"

describe("A7 privileged server-action guard", () => {
  test("anonymous is rejected", () => {
    assert.throws(
      () => assertAdmin({ isAuthenticated: false, role: "STUDENT" }),
      /UNAUTHORIZED/
    )
  })

  test("STUDENT is rejected", () => {
    assert.throws(
      () => assertAdmin({ isAuthenticated: true, role: "STUDENT" }),
      /FORBIDDEN/
    )
  })

  test("TEACHER is rejected for admin-only actions", () => {
    assert.throws(
      () => assertAdmin({ isAuthenticated: true, role: "TEACHER" }),
      /FORBIDDEN/
    )
  })

  test("ADMIN passes", () => {
    assert.doesNotThrow(() =>
      assertAdmin({ isAuthenticated: true, role: "ADMIN" })
    )
    assert.doesNotThrow(() =>
      assertRole({ isAuthenticated: true, role: "TEACHER" }, ["TEACHER", "ADMIN"])
    )
  })
})

describe("A7 tracks mutations fail closed without an admin session", () => {
  test("createTrack is rejected outside an authenticated admin request", async () => {
    const { createTrack } = await import("../../lib/actions/admin/tracks")
    let created = false
    try {
      const result: any = await createTrack({
        title: `A7 probe ${Date.now()}`,
        description: "This mutation must never run without an admin session",
        type: "CAREER" as any,
      })
      created = Boolean(result?.success)
    } catch {
      created = false
    }
    assert.equal(created, false)
  })
})
