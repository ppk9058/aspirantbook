import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { SHOW_PREMIUM_PLAN, shouldRedirectPremiumCheckout } from "@/lib/config/premium"

describe("premium plan flag", () => {
    it("keeps the Premium pass hidden until the Admin price exists", () => {
        assert.equal(SHOW_PREMIUM_PLAN, false)
    })
})

describe("shouldRedirectPremiumCheckout", () => {
    it("redirects a plan-only checkout with plan=yearly while Premium is hidden", () => {
        assert.equal(
            shouldRedirectPremiumCheckout({ productId: null, plan: "yearly" }),
            true
        )
    })

    it("redirects a plan-only checkout with plan=monthly while Premium is hidden", () => {
        assert.equal(
            shouldRedirectPremiumCheckout({ productId: null, plan: "monthly" }),
            true
        )
    })

    it("treats a missing plan param as monthly and redirects", () => {
        assert.equal(
            shouldRedirectPremiumCheckout({ productId: undefined, plan: null }),
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
})
