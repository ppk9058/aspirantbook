/**
 * Phase 5 runtime proof (part 2): entitlement decisions and Stripe fail-closed.
 * Local DB 127.0.0.1:54329/launch_verify only; no provider network calls.
 */
import assert from "node:assert/strict"

const dbUrl = new URL(process.env.DATABASE_URL || "")
assert.equal(dbUrl.hostname, "127.0.0.1")
assert.equal(dbUrl.port, "54329")
assert.equal(dbUrl.pathname, "/launch_verify")

process.env.APP_ENV = "test"
delete process.env.STRIPE_SECRET_KEY

/* eslint-disable @typescript-eslint/no-var-requires */
const { prisma } = require("../../lib/prisma")
const { checkTestAccess } = require("../../lib/auth/entitlements")
const { getStripeClient, isStripeConfigured } = require("../../lib/payments/stripe")

const FREE_USER = "cmw2dsm6i0000xpvtthwwt7sj" // fv.free@example.test
const TEACHER_A = "cmw2dsm7g0002xpvtq9k3zurz"
const ADMIN = "cmw2dsm7j0004xpvtfshu6klh"
const SERIES = "fv-pro-series"
const TEST = "fv-pro-test"

let pass = 0
let fail = 0
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    pass++
    console.log(`PASS | ${name}`)
  } catch (e: any) {
    fail++
    console.log(`FAIL | ${name} | ${e?.message || e}`)
  }
}

async function cleanup() {
  await prisma.examSeriesEnrollment.deleteMany({ where: { seriesId: SERIES } })
  await prisma.examTest.deleteMany({ where: { id: TEST } })
  await prisma.examSeries.deleteMany({ where: { id: SERIES } })
  await prisma.subscription.deleteMany({ where: { userId: FREE_USER, providerId: { startsWith: "p5_ent_" } } })
  await prisma.user.update({ where: { id: FREE_USER }, data: { role: "FREE" } })
}

async function main() {
  await cleanup()
  await prisma.examSeries.create({
    data: {
      id: SERIES,
      title: "FV Pro Series",
      slug: SERIES,
      examName: "FV",
      category: "FV",
      isPro: true,
      isPublished: true,
      createdById: TEACHER_A,
      updatedAt: new Date(),
    },
  })
  await prisma.examTest.create({
    data: {
      id: TEST,
      seriesId: SERIES,
      title: "FV Pro Test",
      testType: "FULL_MOCK",
      accessMode: "PRO",
      isPublished: true,
      createdById: TEACHER_A,
      updatedAt: new Date(),
    },
  })

  console.log("### test entitlement (checkTestAccess)")
  await check("anonymous -> LOCKED", async () => {
    const r = await checkTestAccess(undefined, TEST, "STUDENT")
    assert.equal(r.allowed, false)
    assert.equal(r.reason, "LOCKED")
  })
  await check("FREE user without subscription/enrolment -> LOCKED", async () => {
    const r = await checkTestAccess(FREE_USER, TEST, "STUDENT")
    assert.equal(r.allowed, false)
    assert.equal(r.reason, "LOCKED")
  })
  await check("ADMIN -> ADMIN_OVERRIDE", async () => {
    const r = await checkTestAccess(ADMIN, TEST, "ADMIN")
    assert.equal(r.allowed, true)
    assert.equal(r.reason, "ADMIN_OVERRIDE")
  })
  await check("TEACHER role -> TEACHER_ACCESS", async () => {
    const r = await checkTestAccess(TEACHER_A, TEST, "TEACHER")
    assert.equal(r.allowed, true)
    assert.equal(r.reason, "TEACHER_ACCESS")
  })
  await check("ACTIVE subscription -> SUBSCRIPTION_ACTIVE", async () => {
    await prisma.subscription.create({
      data: {
        userId: FREE_USER,
        plan: "MONTHLY",
        status: "ACTIVE",
        provider: "RAZORPAY",
        providerId: "p5_ent_active",
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
      },
    })
    const r = await checkTestAccess(FREE_USER, TEST, "STUDENT")
    assert.equal(r.allowed, true)
    assert.equal(r.reason, "SUBSCRIPTION_ACTIVE")
  })
  await check("expired subscription only -> LOCKED", async () => {
    await prisma.subscription.deleteMany({ where: { userId: FREE_USER } })
    await prisma.subscription.create({
      data: {
        userId: FREE_USER,
        plan: "MONTHLY",
        status: "ACTIVE",
        provider: "RAZORPAY",
        providerId: "p5_ent_expired",
        startDate: new Date(Date.now() - 40 * 86400000),
        endDate: new Date(Date.now() - 10 * 86400000),
      },
    })
    const r = await checkTestAccess(FREE_USER, TEST, "STUDENT")
    assert.equal(r.allowed, false)
    assert.equal(r.reason, "LOCKED")
  })
  await check("FREE series enrolment does not unlock PRO tests", async () => {
    await prisma.examSeriesEnrollment.create({
      data: { userId: FREE_USER, seriesId: SERIES, enrollType: "FREE", status: "ACTIVE" },
    })
    const r = await checkTestAccess(FREE_USER, TEST, "STUDENT")
    assert.equal(r.allowed, false)
    assert.equal(r.reason, "LOCKED")
  })
  await check("PURCHASED series enrolment unlocks the PRO test", async () => {
    await prisma.examSeriesEnrollment.updateMany({
      where: { userId: FREE_USER, seriesId: SERIES },
      data: { enrollType: "PURCHASED" },
    })
    const r = await checkTestAccess(FREE_USER, TEST, "STUDENT")
    assert.equal(r.allowed, true)
    assert.equal(r.reason, "PURCHASED")
  })
  await check("expired series enrolment does not unlock", async () => {
    await prisma.examSeriesEnrollment.updateMany({
      where: { userId: FREE_USER, seriesId: SERIES },
      data: { enrollType: "PURCHASED", expiresAt: new Date(Date.now() - 86400000) },
    })
    const r = await checkTestAccess(FREE_USER, TEST, "STUDENT")
    assert.equal(r.allowed, false)
    assert.equal(r.reason, "LOCKED")
  })

  console.log("\n### Stripe configuration fails closed")
  await check("STRIPE_SECRET_KEY missing -> isStripeConfigured false", () => {
    delete process.env.STRIPE_SECRET_KEY
    assert.equal(isStripeConfigured(), false)
  })
  await check("STRIPE_SECRET_KEY missing -> getStripeClient throws, no fake client", () => {
    delete process.env.STRIPE_SECRET_KEY
    assert.throws(() => getStripeClient(), /Stripe is not configured/)
  })
  await check("blank STRIPE_SECRET_KEY is treated as missing", () => {
    process.env.STRIPE_SECRET_KEY = "   "
    assert.equal(isStripeConfigured(), false)
    assert.throws(() => getStripeClient(), /Stripe is not configured/)
  })
  await check("dummy key -> client object created offline (no API call)", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy_for_phase5"
    assert.equal(isStripeConfigured(), true)
    const client = getStripeClient()
    assert.equal(typeof client.checkout, "object")
  })

  await cleanup()
  console.log(`\nRESULT pass=${pass} fail=${fail}`)
  await prisma.$disconnect()
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error("HARNESS ERROR", e)
  try {
    await prisma.$disconnect()
  } catch {}
  process.exit(2)
})
