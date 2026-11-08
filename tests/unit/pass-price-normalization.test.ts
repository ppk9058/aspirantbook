import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { PASS_PRICE_INR, PASS_PRICE_PAISE, PASS_VALIDITY_DAYS } from "@/lib/payments/pass-plan"

const ROOT = path.resolve(__dirname, "../..")

test("Pass constants: price is Rs 499 (49900 paise) and validity is 365 days", () => {
    assert.equal(PASS_PRICE_INR, 499, "PASS_PRICE_INR must be 499")
    assert.equal(PASS_PRICE_PAISE, 49900, "PASS_PRICE_PAISE must be 49900")
    assert.equal(PASS_VALIDITY_DAYS, 365, "PASS_VALIDITY_DAYS must be 365")
})

test("lib/actions/payment/razorpay.ts: normalizes to YEARLY and charges 49900 paise", () => {
    const file = fs.readFileSync(path.join(ROOT, "lib/actions/payment/razorpay.ts"), "utf8")
    assert.ok(file.includes("PASS_PRICE_PAISE"), "Must import and use PASS_PRICE_PAISE")
    assert.ok(!file.includes("499900"), "Must not contain 499900 paise")
    assert.ok(!file.includes("4999"), "Must not contain 4999")
    assert.ok(file.includes('const plan = courseId ? (rawPlan || "COURSE") : "YEARLY"'), "Must normalize non-course plan to YEARLY")
    assert.ok(file.includes("amountInPaise = PASS_PRICE_PAISE"), "Must assign amountInPaise to PASS_PRICE_PAISE")
})

test("app/checkout/page.tsx: defaults to yearly, shows Rs 499, preserves USD labels, no 4999", () => {
    const file = fs.readFileSync(path.join(ROOT, "app/checkout/page.tsx"), "utf8")
    assert.ok(!file.includes("4999"), "Must not contain 4999")
    assert.ok(!file.includes("4,999"), "Must not contain 4,999")
    assert.ok(file.includes('searchParams.get("plan") || "yearly"'), "Must default planParam to yearly")
    assert.ok(file.includes('paymentMethod === "razorpay"\n        ? "₹499"'), "Must display ₹499 for Razorpay")
    assert.ok(file.includes('"$190" : "$19"'), "Must preserve international USD labels $190 and $19")
})

test("components/pricing/PricingPlanButton.tsx: sends id YEARLY, uses PASS_PRICE_INR, label / year", () => {
    const file = fs.readFileSync(path.join(ROOT, "components/pricing/PricingPlanButton.tsx"), "utf8")
    assert.ok(file.includes('id: "YEARLY"'), "Must send plan id YEARLY")
    assert.ok(file.includes("price: PASS_PRICE_INR"), "Must use PASS_PRICE_INR")
    assert.ok(file.includes("/ year"), "Must show label / year")
    assert.ok(!file.includes("/ monthly"), "Must not show label / monthly")
})

test("lib/payments/useSamePageBuyNow.ts: maps subscription to yearly only", () => {
    const file = fs.readFileSync(path.join(ROOT, "lib/payments/useSamePageBuyNow.ts"), "utf8")
    assert.ok(file.includes('const planTier = "yearly"'), "Must set planTier to yearly")
    assert.ok(file.includes('const plan = "YEARLY" as const'), "Must set plan to YEARLY")
    assert.ok(file.includes('|| "499"'), "Must preserve fallback || 499 for non-subscription items")
})

test("app/(dashboard)/subscription/page.tsx: per year period and Rs 499/year wording", () => {
    const file = fs.readFileSync(path.join(ROOT, "app/(dashboard)/subscription/page.tsx"), "utf8")
    assert.ok(file.includes('period: "per year"'), "Must state period per year")
    assert.ok(file.includes('activeSubscription.plan === "MONTHLY" ? "₹499/month" : "₹499/year"'), "Must update YEARLY to ₹499/year while keeping legacy MONTHLY label")
    assert.ok(!file.includes("4,999"), "Must not contain 4,999")
})

test("lib/actions/user/subscription.ts: mock upgrade uses PASS_PRICE_INR, no 4999", () => {
    const file = fs.readFileSync(path.join(ROOT, "lib/actions/user/subscription.ts"), "utf8")
    assert.ok(file.includes("amount: PASS_PRICE_INR"), "Must use PASS_PRICE_INR")
    assert.ok(file.includes("toMinorUnits(PASS_PRICE_INR, \"INR\")"), "Must dual-write PASS_PRICE_INR in minor units")
    assert.ok(!file.includes("4999"), "Must not contain 4999")
})

test("lib/payments/razorpay.ts: unused RAZORPAY_PLANS deleted", () => {
    const file = fs.readFileSync(path.join(ROOT, "lib/payments/razorpay.ts"), "utf8")
    assert.ok(!file.includes("RAZORPAY_PLANS"), "Must not contain unused RAZORPAY_PLANS")
    assert.ok(!file.includes("14999"), "Must not contain 14999")
})

test("test-series surfaces show ₹499 / year next to Get Pass", () => {
    const pageFile = fs.readFileSync(path.join(ROOT, "app/(dashboard)/test-series/page.tsx"), "utf8")
    assert.ok(pageFile.includes("₹499 / year"), "Test series page banner and modal must show ₹499 / year")

    const clientFile = fs.readFileSync(path.join(ROOT, "app/(dashboard)/test-series/[id]/TestSeriesDetailClient.tsx"), "utf8")
    assert.ok(clientFile.includes("Get Pass • ₹499 / year"), "Test series detail sticky card must show Get Pass • ₹499 / year")
    assert.ok(clientFile.includes("₹499 / year"), "Test series detail modal must show ₹499 / year")
})

test("/refund and /terms policy wording: Pass is Rs 499, yearly only, 365 days, non-refundable except technical failure", () => {
    const refundFile = fs.readFileSync(path.join(ROOT, "app/refund/page.tsx"), "utf8")
    assert.ok(refundFile.includes("Pass (All-Access Pass)"), "Must have Pass section in /refund")
    assert.ok(refundFile.includes("₹499 per year"), "Must specify ₹499 per year in /refund")
    assert.ok(refundFile.includes("365 days"), "Must specify 365 days in /refund")
    assert.ok(refundFile.includes("non-refundable once purchased, EXCEPT in the case of a technical failure where payment was captured but the Pass was not activated"), "Must specify technical failure refund exception in /refund")

    const termsFile = fs.readFileSync(path.join(ROOT, "app/terms/page.tsx"), "utf8")
    assert.ok(termsFile.includes("The All-Access Pass is ₹499 (yearly only), valid for 365 days from purchase, and is non-refundable once purchased except in the case of a technical failure where payment was captured but the Pass was not activated"), "Must specify Pass terms in Section 4 of /terms")
    assert.ok(termsFile.includes('/refund'), "Must link to /refund in /terms")
})
