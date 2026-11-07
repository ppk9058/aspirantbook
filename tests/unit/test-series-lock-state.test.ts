import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
    resolveTestLockState,
    isPaidSeriesEnrolled,
} from "@/lib/test-series/lock-state"

describe("test-series lock state resolution", () => {
    describe("free tests", () => {
        it("unlocks when isFree is true regardless of enrollment", () => {
            for (const isEnrolled of [true, false, null, undefined]) {
                const res = resolveTestLockState({
                    isFree: true,
                    isEnrolled,
                    showPremiumPlan: false,
                })
                assert.equal(res.isFreeForUser, true)
                assert.equal(res.lockedForUser, false)
                assert.equal(res.disabled, false)
            }
        })

        it("unlocks when accessMode is FREE", () => {
            const res = resolveTestLockState({
                isFree: false,
                accessMode: "FREE",
                isEnrolled: false,
                showPremiumPlan: false,
            })
            assert.equal(res.isFreeForUser, true)
            assert.equal(res.lockedForUser, false)
            assert.equal(res.disabled, false)
        })

        it("unlocks when isFreeSample is true", () => {
            const res = resolveTestLockState({
                isFree: false,
                isFreeSample: true,
                isEnrolled: false,
                showPremiumPlan: false,
            })
            assert.equal(res.isFreeForUser, true)
            assert.equal(res.lockedForUser, false)
            assert.equal(res.disabled, false)
        })
    })

    describe("paid test + enrolled", () => {
        it("unlocks for enrolled user with flag off", () => {
            const res = resolveTestLockState({
                isFree: false,
                isEnrolled: true,
                showPremiumPlan: false,
            })
            assert.equal(res.isFreeForUser, false)
            assert.equal(res.lockedForUser, false)
            assert.equal(res.disabled, false)
        })

        it("unlocks for enrolled user with flag on", () => {
            const res = resolveTestLockState({
                isFree: false,
                isEnrolled: true,
                showPremiumPlan: true,
            })
            assert.equal(res.isFreeForUser, false)
            assert.equal(res.lockedForUser, false)
            assert.equal(res.disabled, false)
        })
    })

    describe("paid test + not enrolled", () => {
        it("locks with disabled=true when flag is off (Locked button)", () => {
            const res = resolveTestLockState({
                isFree: false,
                isEnrolled: false,
                showPremiumPlan: false,
            })
            assert.equal(res.isFreeForUser, false)
            assert.equal(res.lockedForUser, true)
            assert.equal(res.disabled, true)
        })

        it("locks with disabled=false when flag is on (Unlock with Pass button)", () => {
            const res = resolveTestLockState({
                isFree: false,
                isEnrolled: false,
                showPremiumPlan: true,
            })
            assert.equal(res.isFreeForUser, false)
            assert.equal(res.lockedForUser, true)
            assert.equal(res.disabled, false)
        })
    })

    describe("unknown enrollment", () => {
        it("treats null enrollment as not enrolled (safe default)", () => {
            const res = resolveTestLockState({
                isFree: false,
                isEnrolled: null,
                showPremiumPlan: false,
            })
            assert.equal(res.lockedForUser, true)
            assert.equal(res.disabled, true)
        })

        it("treats undefined enrollment as not enrolled (safe default)", () => {
            const res = resolveTestLockState({
                isFree: false,
                isEnrolled: undefined,
                showPremiumPlan: false,
            })
            assert.equal(res.lockedForUser, true)
            assert.equal(res.disabled, true)
        })
    })
})

describe("isPaidSeriesEnrolled helper", () => {
    it("returns false for null, undefined, empty, or unenrolled payload", () => {
        assert.equal(isPaidSeriesEnrolled(null), false)
        assert.equal(isPaidSeriesEnrolled(undefined), false)
        assert.equal(isPaidSeriesEnrolled({}), false)
        assert.equal(isPaidSeriesEnrolled({ enrolled: false }), false)
        assert.equal(isPaidSeriesEnrolled({ enrolled: false, enrollment: null }), false)
    })

    it("returns false for FREE enrollment type (cannot unlock paid tests)", () => {
        assert.equal(
            isPaidSeriesEnrolled({
                enrolled: true,
                enrollment: { id: "en-1", enrollType: "FREE", expiresAt: null },
            }),
            false
        )
    })

    it("returns true for PURCHASED enrollment without expiry", () => {
        assert.equal(
            isPaidSeriesEnrolled({
                enrolled: true,
                enrollment: { id: "en-2", enrollType: "PURCHASED", expiresAt: null },
            }),
            true
        )
    })

    it("returns true for PASS enrollment without expiry", () => {
        assert.equal(
            isPaidSeriesEnrolled({
                enrolled: true,
                enrollment: { id: "en-3", enrollType: "PASS", expiresAt: null },
            }),
            true
        )
    })

    it("returns true for PURCHASED enrollment with future expiry", () => {
        const future = new Date(Date.now() + 86400000).toISOString()
        assert.equal(
            isPaidSeriesEnrolled({
                enrolled: true,
                enrollment: { id: "en-4", enrollType: "PURCHASED", expiresAt: future },
            }),
            true
        )
    })

    it("returns false for PURCHASED enrollment with past expiry", () => {
        const past = new Date(Date.now() - 86400000).toISOString()
        assert.equal(
            isPaidSeriesEnrolled({
                enrolled: true,
                enrollment: { id: "en-5", enrollType: "PURCHASED", expiresAt: past },
            }),
            false
        )
    })
})
