/**
 * Phase 5: prove no fake/mock payment path is reachable outside test mode.
 * Local DB 127.0.0.1:54329/launch_verify; no provider network access.
 */
import assert from "node:assert/strict"

const dbUrl = new URL(process.env.DATABASE_URL || "")
assert.equal(dbUrl.hostname, "127.0.0.1")
assert.equal(dbUrl.port, "54329")
assert.equal(dbUrl.pathname, "/launch_verify")

const FREE_USER = "cmw2dsm6i0000xpvtthwwt7sj"

async function main() {
  process.env.APP_ENV = "development"
  delete process.env.RAZORPAY_KEY_ID
  delete process.env.RAZORPAY_KEY_SECRET
  delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

  const { getRazorpayKeyId, getPaymentMode, isRazorpayTestMode, getRazorpayClient } = require("../../lib/payments/razorpay-config")
  const { createRazorpayOrder } = require("../../lib/actions/payment/razorpay")
  const { prisma } = require("../../lib/prisma")

  console.log(`mode=${getPaymentMode()} keyId=${getRazorpayKeyId()} isTestMode=${isRazorpayTestMode()}`)
  assert.equal(getPaymentMode(), "unconfigured")
  assert.equal(isRazorpayTestMode(), false)

  assert.throws(() => getRazorpayClient(), /Razorpay is not configured/)
  console.log("PASS | getRazorpayClient throws when unconfigured (no placeholder key)")

  const before = await prisma.payment.count({ where: { userId: FREE_USER } })
  await assert.rejects(
    () => createRazorpayOrder({ courseId: "fv-paid-b-id", userId: FREE_USER }),
    /Failed to create Razorpay order/
  )
  const after = await prisma.payment.count({ where: { userId: FREE_USER } })
  console.log(`PASS | createRazorpayOrder fails loudly outside test mode (payments before=${before} after=${after})`)
  assert.equal(after, before, "no pending payment row may be written when the provider is unconfigured")

  console.log("\nRESULT fail=0")
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("FAILED", e)
  process.exit(1)
})
