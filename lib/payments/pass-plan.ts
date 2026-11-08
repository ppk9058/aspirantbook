/**
 * Authoritative constants and plan resolution for the AspirantBook All-Access Pass.
 * The Pass is Rs 499 (49,900 paise), YEARLY ONLY, valid for 365 days from purchase.
 */

export const PASS_PRICE_INR = 499
export const PASS_PRICE_PAISE = 49900
export const PASS_VALIDITY_DAYS = 365

export type PlanResolutionMeta = {
    plan?: string | null
    courseId?: string | null
    isPassOrder?: boolean
}

/**
 * Resolves the effective subscription plan for an order.
 *
 * Rules:
 * 1. If the order is a course order (metadata has courseId or plan is COURSE), it must never
 *    create a Subscription -> returns undefined.
 * 2. If the order metadata has a recognized plan (YEARLY or legacy MONTHLY), return the metadata
 *    plan and ignore the caller-supplied value.
 * 3. If metadata has no plan and the order is a Pass order, return "YEARLY".
 * 4. Never let a caller-supplied value alone upgrade, downgrade, or create a plan.
 */
export function resolveEffectivePlan(
    metaPlanOrMetadata?: string | PlanResolutionMeta | null,
    callerPlan?: string | null,
    options?: { isCourse?: boolean; isPassOrder?: boolean }
): "YEARLY" | "MONTHLY" | undefined {
    let metaPlan: string | undefined
    let isCourse = options?.isCourse ?? false
    let isPassOrder = options?.isPassOrder ?? false

    if (metaPlanOrMetadata && typeof metaPlanOrMetadata === "object") {
        metaPlan = metaPlanOrMetadata.plan ?? undefined
        if (metaPlanOrMetadata.courseId) isCourse = true
        if (metaPlanOrMetadata.isPassOrder) isPassOrder = true
    } else if (typeof metaPlanOrMetadata === "string") {
        metaPlan = metaPlanOrMetadata
    }

    if (metaPlan === "COURSE") {
        isCourse = true
    }

    // A course order must never create a Subscription
    if (isCourse) {
        return undefined
    }

    // If order metadata has a recognized plan, return metadata plan and ignore caller
    if (metaPlan === "YEARLY" || metaPlan === "MONTHLY") {
        return metaPlan
    }

    // If metadata has no plan and the order is a Pass order, return YEARLY
    if (isPassOrder) {
        return "YEARLY"
    }

    // Never let a caller-supplied value alone create or determine a plan
    return undefined
}
