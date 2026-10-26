import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"

import {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayTestMode,
  resetRazorpayClientForTests,
} from "@/lib/payments/razorpay-config"

/**
 * V3 regression: the Razorpay SDK client is built lazily and fails closed.
 *
 * Before the fix the payment action created the client at module load with
 * `RAZORPAY_KEY_SECRET || "rzp_secret_placeholder"` and fell back to a mock
 * order whenever the secret was missing - in production as well. A
 * misconfigured deployment therefore handed out fake "successful" orders.
 */

// @types/node marks NODE_ENV as read-only; the tests need to change it.
const env = process.env as Record<string, string | undefined>

const originalKeyId = env.RAZORPAY_KEY_ID
const originalKeySecret = env.RAZORPAY_KEY_SECRET
const originalAppEnv = env.APP_ENV
const originalNodeEnv = env.NODE_ENV
const originalPublicKeyId = env.NEXT_PUBLIC_RAZORPAY_KEY_ID

function restoreEnv() {
  if (originalKeyId === undefined) delete env.RAZORPAY_KEY_ID
  else env.RAZORPAY_KEY_ID = originalKeyId
  if (originalKeySecret === undefined) delete env.RAZORPAY_KEY_SECRET
  else env.RAZORPAY_KEY_SECRET = originalKeySecret
  if (originalAppEnv === undefined) delete env.APP_ENV
  else env.APP_ENV = originalAppEnv
  if (originalNodeEnv === undefined) delete env.NODE_ENV
  else env.NODE_ENV = originalNodeEnv
  if (originalPublicKeyId === undefined) delete env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  else env.NEXT_PUBLIC_RAZORPAY_KEY_ID = originalPublicKeyId
  resetRazorpayClientForTests()
}

describe("V3: Razorpay credentials fail closed", () => {
  beforeEach(() => {
    restoreEnv()
    resetRazorpayClientForTests()
  })

  it("has no placeholder key id", () => {
    delete env.RAZORPAY_KEY_ID
    delete env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    assert.equal(getRazorpayKeyId(), null)
  })

  it("throws instead of using a placeholder secret", () => {
    delete env.RAZORPAY_KEY_ID
    delete env.RAZORPAY_KEY_SECRET
    assert.throws(() => getRazorpayClient(), /Razorpay is not configured/)
  })

  it("throws when only one credential is present", () => {
    env.RAZORPAY_KEY_ID = "rzp_test_key"
    delete env.RAZORPAY_KEY_SECRET
    assert.throws(() => getRazorpayClient(), /Razorpay is not configured/)
  })

  it("builds one client when both credentials are present", () => {
    env.RAZORPAY_KEY_ID = "rzp_test_key"
    env.RAZORPAY_KEY_SECRET = "test_secret"
    const first = getRazorpayClient()
    const second = getRazorpayClient()
    assert.equal(first, second, "the client is created once")
    assert.ok(first)
  })

  it("only treats an explicit test environment as test mode", () => {
    env.APP_ENV = "test"
    delete env.NODE_ENV
    assert.equal(isRazorpayTestMode(), true)

    delete env.APP_ENV
    env.NODE_ENV = "production"
    assert.equal(isRazorpayTestMode(), false)
  })

  it("createRazorpayOrder rejects a missing secret outside test mode (no mock order)", async () => {
    const databaseUrl = env.DATABASE_URL || ""
    const parsed = new URL(databaseUrl)
    assert.equal(
      `${parsed.hostname}:${parsed.port}`,
      "127.0.0.1:54329",
      "this test must only run against the isolated test database"
    )

    const { createRazorpayOrder } = await import("@/lib/actions/payment/razorpay")

    // Importing the action pulls in modules that load .env, so enforce the
    // fail-closed configuration *after* the import.
    delete env.RAZORPAY_KEY_ID
    delete env.RAZORPAY_KEY_SECRET
    // Explicit non-test values: deleting NODE_ENV is not reliable inside the
    // node:test runner, which sets it to "test" for the process.
    env.APP_ENV = "production"
    env.NODE_ENV = "production"
    resetRazorpayClientForTests()

    await assert.rejects(
      () => createRazorpayOrder({ plan: "MONTHLY", userId: "v3-config-test-user" }),
      /Failed to create Razorpay order/,
      "a missing secret must not produce a mock order"
    )

    restoreEnv()
  })
})
