import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

export interface CourseBadgeInfo {
    couponId: string
    code: string
    badgeLabel: string
    badgeShape: "STARBURST" | "RIBBON" | "CIRCLE" | "PILL" | string
    badgeColor: string
    discountType: "PERCENT" | "FLAT" | string
    discountValue: number
    discountText: string
    discountPaise: number
}

export type CourseBadgeMap = Record<string, CourseBadgeInfo>

/**
 * Batched query returning the best currently-valid badge coupon for an array of courses.
 * Rules:
 * - Only coupons with showOnThumbnail = true and isActive = true
 * - now between validFrom and validUntil
 * - Global coupons (courseId is null) apply to every paid course
 * - Course-scoped coupons match course.id or course.slug
 * - Best coupon = highest discount in paise for that course's price (ties -> newest createdAt)
 * - If final price < 100 paise or course is free -> omitted
 * - Short cache revalidation (30 seconds)
 */
async function fetchCourseBadges(courseIdsOrSlugs: string[]): Promise<CourseBadgeMap> {
    if (!courseIdsOrSlugs || courseIdsOrSlugs.length === 0) return {}

    const now = new Date()

    // 1. Fetch courses to know their price and premium status
    const courses = await prisma.course.findMany({
        where: {
            OR: [
                { id: { in: courseIdsOrSlugs } },
                { slug: { in: courseIdsOrSlugs } },
            ],
            status: "PUBLISHED",
            isPublished: true,
        },
        select: {
            id: true,
            slug: true,
            price: true,
            isPremium: true,
        },
    })

    const paidCourses = courses.filter((c) => c.isPremium && (c.price ?? 0) > 0)
    if (paidCourses.length === 0) return {}

    const targetCourseIds = paidCourses.map((c) => c.id)

    // 2. Fetch all active thumbnail coupons
    const coupons = await prisma.coupon.findMany({
        where: {
            showOnThumbnail: true,
            isActive: true,
            OR: [
                { courseId: { in: targetCourseIds } },
                { courseId: null },
            ],
            AND: [
                { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
                { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
            ],
        },
        orderBy: { createdAt: "desc" },
    })

    const badgeMap: CourseBadgeMap = {}

    for (const course of paidCourses) {
        const priceNum = course.price ?? 0
        const pricePaise = Math.round(priceNum * 100)

        // Find applicable coupons
        const applicable = coupons.filter(
            (c) => c.courseId === course.id || c.courseId === null
        )

        let bestCoupon: any = null
        let bestDiscountPaise = -1

        for (const c of applicable) {
            let discPaise = 0
            if (c.discountType === "PERCENT") {
                discPaise = Math.floor((pricePaise * c.discountValue) / 100)
                if (c.maxDiscountAmount) {
                    discPaise = Math.min(discPaise, Math.round(c.maxDiscountAmount * 100))
                }
            } else if (c.discountType === "FLAT") {
                discPaise = Math.round(c.discountValue * 100)
                discPaise = Math.min(discPaise, pricePaise)
            }

            const finalPaise = pricePaise - discPaise
            if (finalPaise < 100) continue // under ₹1 rejected

            if (discPaise > bestDiscountPaise) {
                bestDiscountPaise = discPaise
                bestCoupon = c
            }
        }

        if (bestCoupon && bestCoupon.badgeLabel) {
            const badgeInfo: CourseBadgeInfo = {
                couponId: bestCoupon.id,
                code: bestCoupon.code,
                badgeLabel: bestCoupon.badgeLabel,
                badgeShape: bestCoupon.badgeShape || "PILL",
                badgeColor: bestCoupon.badgeColor || "#10B981",
                discountType: bestCoupon.discountType,
                discountValue: bestCoupon.discountValue,
                discountText:
                    bestCoupon.discountType === "FLAT"
                        ? `₹${bestCoupon.discountValue} off`
                        : `${bestCoupon.discountValue}% off`,
                discountPaise: bestDiscountPaise,
            }
            badgeMap[course.id] = badgeInfo
            badgeMap[course.slug] = badgeInfo
        }
    }

    return badgeMap
}

export async function getCourseBadgesRaw(courseIdsOrSlugs: string[]): Promise<CourseBadgeMap> {
    return fetchCourseBadges(courseIdsOrSlugs)
}

const cachedCourseBadges = unstable_cache(
    fetchCourseBadges,
    ["course-promo-badges"],
    { revalidate: 30, tags: ["coupons", "courses"] }
)

export async function getCourseBadges(courseIdsOrSlugs: string[]): Promise<CourseBadgeMap> {
    try {
        return await cachedCourseBadges(courseIdsOrSlugs)
    } catch (e: any) {
        if (e.message?.includes("incrementalCache") || e.message?.includes("unstable_cache")) {
            return await fetchCourseBadges(courseIdsOrSlugs)
        }
        throw e
    }
}
