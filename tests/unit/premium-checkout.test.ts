import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { SHOW_PREMIUM_PLAN, shouldRedirectPremiumCheckout } from "@/lib/config/premium"

describe("premium plan flag", () => {
    it("enables the Premium pass plan per owner decision", () => {
        assert.equal(SHOW_PREMIUM_PLAN, true)
    })
})

describe("shouldRedirectPremiumCheckout", () => {
    it("redirects a plan-only checkout with plan=yearly while Premium is hidden (explicit argument)", () => {
        assert.equal(
            shouldRedirectPremiumCheckout({ productId: null, plan: "yearly", showPremiumPlan: false }),
            true
        )
    })

    it("redirects a plan-only checkout with plan=monthly while Premium is hidden (explicit argument)", () => {
        assert.equal(
            shouldRedirectPremiumCheckout({ productId: null, plan: "monthly", showPremiumPlan: false }),
            true
        )
    })

    it("treats a missing plan param as monthly and redirects while Premium is hidden (explicit argument)", () => {
        assert.equal(
            shouldRedirectPremiumCheckout({ productId: undefined, plan: null, showPremiumPlan: false }),
            true
        )
    })

    it("never redirects a product checkout (course, batch, test series, book)", () => {
        for (const productId of ["some-course-slug", "some-batch-slug", "some-test-series-id"]) {
            assert.equal(
                shouldRedirectPremiumCheckout({ productId, plan: "yearly" }),
                false
            )
        }
    })

    it("does not redirect anything once Premium is shown again", () => {
        assert.equal(
            shouldRedirectPremiumCheckout({
                productId: null,
                plan: "yearly",
                showPremiumPlan: true,
            }),
            false
        )
    })

    it("does not redirect plan-only checkout by default when SHOW_PREMIUM_PLAN is true", () => {
        assert.equal(
            shouldRedirectPremiumCheckout({ productId: null, plan: "yearly" }),
            false
        )
    })
})
