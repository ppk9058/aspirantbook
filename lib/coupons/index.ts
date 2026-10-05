import { prisma } from "@/lib/prisma"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"

export interface CouponValidationSuccess {
    valid: true
    coupon: {
        id: string
        code: string
        discountType: string
        discountValue: number
        maxDiscountAmount: number | null
        showOnThumbnail: boolean
        badgeLabel: string | null
        badgeShape: string | null
        badgeColor: string | null
    }
    course: {
        id: string
        slug: string
        title: string
        price: number
    }
    originalPricePaise: number
    discountPaise: number
    finalPricePaise: number
}

export interface CouponValidationFailure {
    valid: false
    error: string
    adminReason?: string
}

export type CouponValidationResult = CouponValidationSuccess | CouponValidationFailure

export function normalizeCouponCode(code: string): string {
    return (code || "").trim().toUpperCase()
}

/**
 * Validates a coupon for a given course and user in integer paise.
 * Generic error message returned on failure to prevent enumeration or reason leakage.
 */
export async function validateCoupon(params: {
    code: string
    courseId: string
    userId?: string
    userRole?: string
}): Promise<CouponValidationResult> {
    const normalized = normalizeCouponCode(params.code)
    if (!normalized || normalized.length < 3 || normalized.length > 20) {
        return { valid: false, error: "Invalid or expired coupon", adminReason: "Code length invalid" }
    }

    // 1. Fetch Course
    const course = await prisma.course.findFirst({
        where: {
            OR: [
                { id: params.courseId },
                { slug: params.courseId },
            ],
        },
        select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            isPremium: true,
            status: true,
            isPublished: true,
        },
    })

    if (!course || !isCourseVisibleToUser(course, params.userRole)) {
        return { valid: false, error: "Invalid or expired coupon", adminReason: "Course not found or invisible" }
    }

    const priceNum = course.price ?? 0
    if (!course.isPremium || priceNum <= 0) {
        return { valid: false, error: "Invalid or expired coupon", adminReason: "Coupon cannot be applied to free course" }
    }

    // 2. Fetch Coupon
    const coupon = await prisma.coupon.findUnique({
        where: { code: normalized },
    })

    if (!coupon || !coupon.isActive) {
        return { valid: false, error: "Invalid or expired coupon", adminReason: "Coupon does not exist or is inactive" }
    }

    const now = new Date()
    if (coupon.validFrom && now < coupon.validFrom) {
        return { valid: false, error: "Invalid or expired coupon", adminReason: "Coupon validFrom is in future" }
    }
    if (coupon.validUntil && now > coupon.validUntil) {
        return { valid: false, error: "Invalid or expired coupon", adminReason: "Coupon expired" }
    }

    // Check course scope (null means global to all paid courses)
    if (coupon.courseId && coupon.courseId !== course.id) {
        return { valid: false, error: "Invalid or expired coupon", adminReason: "Coupon does not apply to this course" }
    }

    // 3. Check Redemptions Count (REDEEMED + unexpired RESERVED)
    const activeRedemptionsCount = await prisma.couponRedemption.count({
        where: {
            couponId: coupon.id,
            OR: [
                { status: "REDEEMED" },
                {
                    status: "RESERVED",
                    expiresAt: { gt: now },
                },
            ],
        },
    })

    if (coupon.maxRedemptions !== null && activeRedemptionsCount >= coupon.maxRedemptions) {
        return { valid: false, error: "Invalid or expired coupon", adminReason: "maxRedemptions reached" }
    }

    // 4. Check Per-User Limit
    if (params.userId) {
        const userRedemptionsCount = await prisma.couponRedemption.count({
            where: {
                couponId: coupon.id,
                userId: params.userId,
                OR: [
                    { status: "REDEEMED" },
                    {
                        status: "RESERVED",
                        expiresAt: { gt: now },
                    },
                ],
            },
        })

        if (userRedemptionsCount >= coupon.perUserLimit) {
            return { valid: false, error: "Invalid or expired coupon", adminReason: "perUserLimit reached" }
        }
    }

    // 5. Money Math in Integer Paise
    const originalPricePaise = Math.round(priceNum * 100)
    let discountPaise = 0

    if (coupon.discountType === "PERCENT") {
        discountPaise = Math.floor((originalPricePaise * coupon.discountValue) / 100)
        if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount > 0) {
            const maxPaise = Math.round(coupon.maxDiscountAmount * 100)
            discountPaise = Math.min(discountPaise, maxPaise)
        }
    } else if (coupon.discountType === "FLAT") {
        discountPaise = Math.round(coupon.discountValue * 100)
        discountPaise = Math.min(discountPaise, originalPricePaise)
    } else {
        return { valid: false, error: "Invalid or expired coupon", adminReason: `Unknown discountType: ${coupon.discountType}` }
    }

    const finalPricePaise = originalPricePaise - discountPaise

    // Rule: final price must be >= 100 paise (₹1)
    if (finalPricePaise < 100) {
        console.warn(`[Coupon] Coupon ${coupon.code} rejected: final price ${finalPricePaise} paise is under ₹1`)
        return { valid: false, error: "Invalid or expired coupon", adminReason: "Final price under ₹1" }
    }

    return {
        valid: true,
        coupon: {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            maxDiscountAmount: coupon.maxDiscountAmount,
            showOnThumbnail: coupon.showOnThumbnail,
            badgeLabel: coupon.badgeLabel,
            badgeShape: coupon.badgeShape,
            badgeColor: coupon.badgeColor,
        },
        course: {
            id: course.id,
            slug: course.slug,
            title: course.title,
            price: priceNum,
        },
        originalPricePaise,
        discountPaise,
        finalPricePaise,
    }
}
