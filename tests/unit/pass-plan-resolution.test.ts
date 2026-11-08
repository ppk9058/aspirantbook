import test from "node:test"
import assert from "node:assert/strict"
import { resolveEffectivePlan } from "@/lib/payments/pass-plan"

test("resolveEffectivePlan: metadata YEARLY + caller MONTHLY -> YEARLY", () => {
    // When order metadata specifies YEARLY, caller cannot downgrade to MONTHLY
    const resString = resolveEffectivePlan("YEARLY", "MONTHLY")
    assert.equal(resString, "YEARLY", "Metadata string plan YEARLY must take precedence over caller MONTHLY")

    const resObj = resolveEffectivePlan({ plan: "YEARLY" }, "MONTHLY")
    assert.equal(resObj, "YEARLY", "Metadata object plan YEARLY must take precedence over caller MONTHLY")
})

test("resolveEffectivePlan: metadata YEARLY + caller undefined -> YEARLY", () => {
    // When caller provides no plan, metadata YEARLY is preserved
    const resString = resolveEffectivePlan("YEARLY", undefined)
    assert.equal(resString, "YEARLY", "Metadata string plan YEARLY must be returned when caller is undefined")

    const resObj = resolveEffectivePlan({ plan: "YEARLY" }, undefined)
    assert.equal(resObj, "YEARLY", "Metadata object plan YEARLY must be returned when caller is undefined")
})

test("resolveEffectivePlan: no metadata plan + Pass order -> YEARLY", () => {
    // Pass order without an explicit metadata plan resolves to YEARLY
    const resOptions = resolveEffectivePlan(undefined, "MONTHLY", { isPassOrder: true })
    assert.equal(resOptions, "YEARLY", "Pass order without metadata plan must resolve to YEARLY, ignoring caller MONTHLY")

    const resObj = resolveEffectivePlan({ isPassOrder: true }, undefined)
    assert.equal(resObj, "YEARLY", "Pass order object without metadata plan must resolve to YEARLY")
})

test("resolveEffectivePlan: caller value alone never wins", () => {
    // When metadata has no plan and it is not a pass order, caller value must never create a plan
    const resMonthly = resolveEffectivePlan(undefined, "MONTHLY")
    assert.equal(resMonthly, undefined, "Caller MONTHLY alone must not create a subscription plan")

    const resYearly = resolveEffectivePlan(null, "YEARLY")
    assert.equal(resYearly, undefined, "Caller YEARLY alone must not create a subscription plan")

    const resEmptyObj = resolveEffectivePlan({}, "YEARLY")
    assert.equal(resEmptyObj, undefined, "Empty metadata object with caller YEARLY must return undefined")
})

test("resolveEffectivePlan: course order -> no plan", () => {
    // A course order must never create a subscription under any circumstances
    const resCourseMeta = resolveEffectivePlan({ courseId: "course_123", plan: "COURSE" }, "YEARLY")
    assert.equal(resCourseMeta, undefined, "Course order with courseId and COURSE plan must return undefined")

    const resCourseIdOnly = resolveEffectivePlan({ courseId: "course_123" }, "YEARLY")
    assert.equal(resCourseIdOnly, undefined, "Course order with courseId must return undefined even if caller sends YEARLY")

    const resCoursePlanString = resolveEffectivePlan("COURSE", "YEARLY")
    assert.equal(resCoursePlanString, undefined, "Metadata plan COURSE must return undefined")

    const resCourseOption = resolveEffectivePlan("YEARLY", "YEARLY", { isCourse: true })
    assert.equal(resCourseOption, undefined, "Explicit isCourse option must prevent subscription creation")
})

test("resolveEffectivePlan: legacy metadata MONTHLY -> MONTHLY", () => {
    // Existing legacy monthly subscriptions are preserved
    const resLegacy = resolveEffectivePlan("MONTHLY", undefined)
    assert.equal(resLegacy, "MONTHLY", "Existing legacy metadata plan MONTHLY must be preserved")

    const resLegacyObj = resolveEffectivePlan({ plan: "MONTHLY" }, "YEARLY")
    assert.equal(resLegacyObj, "MONTHLY", "Existing legacy metadata plan MONTHLY must ignore caller override")
})
