/**
 * Master switch for the Premium (yearly pass) plan.
 *
 * Set this to `true` ONLY after the Admin pass price exists and checkout /
 * entitlements are fixed. While it is `false`, Premium selling UI is hidden and
 * products are bought individually at their own Admin-set prices.
 */
export const SHOW_PREMIUM_PLAN = true

/**
 * Pure rule for the checkout page: a Premium (pass) checkout is one that has no
 * product id and asks for the monthly or yearly plan (missing plan counts as
 * monthly). While Premium is hidden those checkouts go back to /pricing.
 * Product checkouts (course, batch, test series, book) are never redirected.
 */
export function shouldRedirectPremiumCheckout({
    productId,
    plan,
    showPremiumPlan = SHOW_PREMIUM_PLAN,
}: {
    productId: string | null | undefined
    plan: string | null | undefined
    showPremiumPlan?: boolean
}): boolean {
    if (showPremiumPlan) return false
    if (productId) return false
    const normalisedPlan = (plan || "monthly").toLowerCase()
    return normalisedPlan === "monthly" || normalisedPlan === "yearly"
}
