import { SHOW_PREMIUM_PLAN } from "@/lib/config/premium"

export interface TestLockInput {
    /** `isFree` as returned by /api/exam/test/list (already gate-aware). */
    isFree: boolean
    /** Per-test access mode; "FREE" always unlocks. */
    accessMode?: string | null
    /** Free sample of a Pro series. */
    isFreeSample?: boolean
    /** Series enrollment for the current user. Unknown/null means "not enrolled". */
    isEnrolled: boolean | null | undefined
    showPremiumPlan?: boolean
}

export interface TestLockState {
    /** The test is free for this user (free test, FREE access mode or free sample). */
    isFreeForUser: boolean
    /** Paid test the user cannot open: not free and not enrolled. */
    lockedForUser: boolean
    /** Flag-off: the lock is shown as a neutral disabled button, never as Pass selling UI. */
    disabled: boolean
}

/**
 * Single source of truth for the test-series detail action button.
 *
 * - Free tests / FREE access mode / free samples are never locked.
 * - A paid test is locked unless the user has an active series enrollment.
 * - Unknown enrollment is treated as not enrolled (safe default).
 * - While Premium is hidden, a locked test is a neutral disabled button
 *   ("Locked"); with Premium on it keeps the old "Unlock with Pass" flow.
 */
export function resolveTestLockState({
    isFree,
    accessMode,
    isFreeSample,
    isEnrolled,
    showPremiumPlan = SHOW_PREMIUM_PLAN,
}: TestLockInput): TestLockState {
    const isFreeForUser = Boolean(isFree || accessMode === "FREE" || isFreeSample)
    const lockedForUser = !isFreeForUser && !isEnrolled

    return {
        isFreeForUser,
        lockedForUser,
        disabled: !showPremiumPlan && lockedForUser,
    }
}

export interface SeriesEnrollmentPayload {
    enrolled?: boolean
    enrollment?: {
        id?: string
        enrollType?: string | null
        expiresAt?: string | null
    } | null
}

/**
 * Decides whether an enrollment payload from GET /api/exam/series/enroll
 * confers paid access to tests.
 *
 * - Must have enrolled = true and a valid enrollment record.
 * - enrollType must be "PURCHASED" or "PASS" (FREE enrollments never unlock paid tests).
 * - If expiresAt is set, it must not be in the past.
 */
export function isPaidSeriesEnrolled(data?: SeriesEnrollmentPayload | null): boolean {
    if (!data || !data.enrolled || !data.enrollment) return false
    const { enrollType, expiresAt } = data.enrollment
    if (enrollType !== "PURCHASED" && enrollType !== "PASS") return false
    if (expiresAt) {
        const expiry = new Date(expiresAt).getTime()
        if (!isNaN(expiry) && expiry <= Date.now()) return false
    }
    return true
}
