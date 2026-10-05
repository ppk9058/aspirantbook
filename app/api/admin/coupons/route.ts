import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const CODE_REGEX = /^[A-Z0-9_-]{3,20}$/
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const VALID_SHAPES = ["STARBURST", "RIBBON", "CIRCLE", "PILL"]

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get("courseId")

        const whereClause: any = {}
        if (courseId) {
            whereClause.OR = [
                { courseId: courseId },
                { courseId: null },
            ]
        }

        const coupons = await prisma.coupon.findMany({
            where: whereClause,
            include: {
                course: {
                    select: { id: true, title: true, slug: true, price: true },
                },
                _count: {
                    select: {
                        redemptions: {
                            where: { status: "REDEEMED" },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        const formatted = coupons.map((c) => ({
            id: c.id,
            code: c.code,
            courseId: c.courseId,
            courseTitle: c.course?.title || "Global (All Paid Courses)",
            coursePrice: c.course?.price ?? null,
            discountType: c.discountType,
            discountValue: c.discountValue,
            maxDiscountAmount: c.maxDiscountAmount,
            maxRedemptions: c.maxRedemptions,
            perUserLimit: c.perUserLimit,
            validFrom: c.validFrom ? c.validFrom.toISOString() : null,
            validUntil: c.validUntil ? c.validUntil.toISOString() : null,
            isActive: c.isActive,
            offerAfterDemo: c.offerAfterDemo,
            showOnThumbnail: c.showOnThumbnail,
            badgeLabel: c.badgeLabel,
            badgeShape: c.badgeShape,
            badgeColor: c.badgeColor,
            redeemedCount: c._count.redemptions,
            createdAt: c.createdAt.toISOString(),
        }))

        return NextResponse.json({ success: true, coupons: formatted })
    } catch (err: any) {
        console.error("Admin coupons GET error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
        }

        const body = await req.json().catch(() => ({}))
        const {
            code,
            courseId,
            discountType,
            discountValue,
            maxDiscountAmount,
            maxRedemptions,
            perUserLimit,
            validFrom,
            validUntil,
            isActive = true,
            offerAfterDemo = false,
            showOnThumbnail = false,
            badgeLabel,
            badgeShape,
            badgeColor,
        } = body

        // 1. Validate Code
        const normalizedCode = (code || "").trim().toUpperCase()
        if (!CODE_REGEX.test(normalizedCode)) {
            return NextResponse.json(
                { error: "Coupon code must be 3-20 uppercase letters, numbers, hyphens or underscores." },
                { status: 400 }
            )
        }

        // Check uniqueness
        const existing = await prisma.coupon.findUnique({
            where: { code: normalizedCode },
        })
        if (existing) {
            return NextResponse.json(
                { error: `Coupon code '${normalizedCode}' already exists.` },
                { status: 400 }
            )
        }

        // 2. Validate Discount Type & Value
        if (discountType !== "PERCENT" && discountType !== "FLAT") {
            return NextResponse.json(
                { error: "Discount type must be PERCENT or FLAT." },
                { status: 400 }
            )
        }

        const numericValue = Number(discountValue)
        if (isNaN(numericValue) || numericValue <= 0) {
            return NextResponse.json(
                { error: "Discount value must be a positive number." },
                { status: 400 }
            )
        }

        if (discountType === "PERCENT" && (numericValue < 1 || numericValue > 99)) {
            return NextResponse.json(
                { error: "Percentage discount must be between 1% and 99%." },
                { status: 400 }
            )
        }

        if (discountType === "FLAT" && numericValue < 1) {
            return NextResponse.json(
                { error: "Flat discount must be at least ₹1." },
                { status: 400 }
            )
        }

        // 3. Validate Course scope if provided
        let resolvedCourse: any = null
        if (courseId) {
            resolvedCourse = await prisma.course.findUnique({
                where: { id: courseId },
            })
            if (!resolvedCourse) {
                return NextResponse.json(
                    { error: "Specified course was not found." },
                    { status: 400 }
                )
            }
            if (resolvedCourse.price && resolvedCourse.price > 0) {
                const originalPaise = Math.round(resolvedCourse.price * 100)
                let discPaise = 0
                if (discountType === "PERCENT") {
                    discPaise = Math.floor((originalPaise * numericValue) / 100)
                    if (maxDiscountAmount) {
                        discPaise = Math.min(discPaise, Math.round(Number(maxDiscountAmount) * 100))
                    }
                } else {
                    discPaise = Math.round(numericValue * 100)
                }
                if (originalPaise - discPaise < 100) {
                    return NextResponse.json(
                        { error: "Warning: Coupon results in final price under ₹1 for this course." },
                        { status: 400 }
                    )
                }
            }
        }

        // 4. Validate Badge Fields
        let cleanBadgeLabel: string | null = null
        let cleanBadgeShape: string | null = null
        let cleanBadgeColor: string | null = null

        if (showOnThumbnail) {
            if (!badgeLabel || typeof badgeLabel !== "string" || !badgeLabel.trim()) {
                return NextResponse.json(
                    { error: "Badge label is required when showOnThumbnail is enabled." },
                    { status: 400 }
                )
            }
            // Strip any HTML tags to ensure plain text only
            cleanBadgeLabel = badgeLabel.replace(/<[^>]*>?/gm, "").trim().slice(0, 24)
            if (!cleanBadgeLabel) {
                return NextResponse.json(
                    { error: "Badge label must contain valid text." },
                    { status: 400 }
                )
            }

            if (!badgeShape || !VALID_SHAPES.includes(badgeShape)) {
                return NextResponse.json(
                    { error: "Badge shape must be STARBURST, RIBBON, CIRCLE, or PILL." },
                    { status: 400 }
                )
            }
            cleanBadgeShape = badgeShape

            if (!badgeColor || !HEX_COLOR_REGEX.test(badgeColor)) {
                return NextResponse.json(
                    { error: "Badge color must be a valid 6-character hex code (e.g. #10B981)." },
                    { status: 400 }
                )
            }
            cleanBadgeColor = badgeColor.toUpperCase()
        }

        // 5. Create Coupon in DB
        const coupon = await prisma.coupon.create({
            data: {
                code: normalizedCode,
                courseId: courseId || null,
                discountType,
                discountValue: numericValue,
                maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
                maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
                perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
                validFrom: validFrom ? new Date(validFrom) : null,
                validUntil: validUntil ? new Date(validUntil) : null,
                isActive: Boolean(isActive),
                offerAfterDemo: Boolean(offerAfterDemo),
                showOnThumbnail: Boolean(showOnThumbnail),
                badgeLabel: cleanBadgeLabel,
                badgeShape: cleanBadgeShape,
                badgeColor: cleanBadgeColor,
                createdById: session.user.id,
            },
        })

        return NextResponse.json({ success: true, coupon }, { status: 201 })
    } catch (err: any) {
        console.error("Admin coupons POST error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
