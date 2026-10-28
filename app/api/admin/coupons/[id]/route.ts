import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags"

const CODE_REGEX = /^[A-Z0-9_-]{3,20}$/
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const VALID_SHAPES = ["STARBURST", "RIBBON", "CIRCLE", "PILL"]

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
        }

        const { id } = await params
        const existing = await prisma.coupon.findUnique({
            where: { id },
            include: {
                _count: { select: { redemptions: true } },
            },
        })

        if (!existing) {
            return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
        }

        const body = await req.json().catch(() => ({}))
        const {
            code,
            discountType,
            discountValue,
            maxDiscountAmount,
            maxRedemptions,
            perUserLimit,
            validFrom,
            validUntil,
            isActive,
            offerAfterDemo,
            showOnThumbnail,
            badgeLabel,
            badgeShape,
            badgeColor,
        } = body

        const updateData: any = {}

        if (code !== undefined) {
            const normalizedCode = (code || "").trim().toUpperCase()
            if (!CODE_REGEX.test(normalizedCode)) {
                return NextResponse.json(
                    { error: "Coupon code must be 3-20 uppercase letters, numbers, hyphens or underscores." },
                    { status: 400 }
                )
            }
            if (normalizedCode !== existing.code) {
                if (existing._count.redemptions > 0) {
                    return NextResponse.json(
                        { error: "Cannot change code of a coupon that already has redemptions." },
                        { status: 400 }
                    )
                }
                const duplicate = await prisma.coupon.findUnique({ where: { code: normalizedCode } })
                if (duplicate) {
                    return NextResponse.json(
                        { error: `Coupon code '${normalizedCode}' already exists.` },
                        { status: 400 }
                    )
                }
                updateData.code = normalizedCode
            }
        }

        if (discountType !== undefined) {
            if (discountType !== "PERCENT" && discountType !== "FLAT") {
                return NextResponse.json({ error: "Discount type must be PERCENT or FLAT." }, { status: 400 })
            }
            updateData.discountType = discountType
        }

        if (discountValue !== undefined) {
            const numericValue = Number(discountValue)
            if (isNaN(numericValue) || numericValue <= 0) {
                return NextResponse.json({ error: "Discount value must be a positive number." }, { status: 400 })
            }
            const type = discountType || existing.discountType
            if (type === "PERCENT" && (numericValue < 1 || numericValue > 99)) {
                return NextResponse.json({ error: "Percentage discount must be between 1% and 99%." }, { status: 400 })
            }
            if (type === "FLAT" && numericValue < 1) {
                return NextResponse.json({ error: "Flat discount must be at least ₹1." }, { status: 400 })
            }
            updateData.discountValue = numericValue
        }

        if (maxDiscountAmount !== undefined) updateData.maxDiscountAmount = maxDiscountAmount ? Number(maxDiscountAmount) : null
        if (maxRedemptions !== undefined) updateData.maxRedemptions = maxRedemptions ? Number(maxRedemptions) : null
        if (perUserLimit !== undefined) updateData.perUserLimit = perUserLimit ? Number(perUserLimit) : 1
        if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null
        if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null
        if (isActive !== undefined) updateData.isActive = Boolean(isActive)
        if (offerAfterDemo !== undefined) updateData.offerAfterDemo = Boolean(offerAfterDemo)

        if (showOnThumbnail !== undefined) {
            const isShow = Boolean(showOnThumbnail)
            updateData.showOnThumbnail = isShow
            if (isShow) {
                const label = badgeLabel !== undefined ? badgeLabel : existing.badgeLabel
                const shape = badgeShape !== undefined ? badgeShape : existing.badgeShape
                const color = badgeColor !== undefined ? badgeColor : existing.badgeColor

                if (!label || typeof label !== "string" || !label.trim()) {
                    return NextResponse.json({ error: "Badge label is required when showOnThumbnail is enabled." }, { status: 400 })
                }
                updateData.badgeLabel = label.replace(/<[^>]*>?/gm, "").trim().slice(0, 24)

                if (!shape || !VALID_SHAPES.includes(shape)) {
                    return NextResponse.json({ error: "Badge shape must be STARBURST, RIBBON, CIRCLE, or PILL." }, { status: 400 })
                }
                updateData.badgeShape = shape

                if (!color || !HEX_COLOR_REGEX.test(color)) {
                    return NextResponse.json({ error: "Badge color must be a valid 6-character hex code (e.g. #10B981)." }, { status: 400 })
                }
                updateData.badgeColor = color.toUpperCase()
            }
        }

        const updated = await prisma.coupon.update({
            where: { id },
            data: updateData,
        })

        safeRevalidateTags(CACHE_TAGS.coupons, CACHE_TAGS.courses)
        return NextResponse.json({ success: true, coupon: updated })
    } catch (err: any) {
        console.error("Admin coupons PUT error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
        }

        const { id } = await params
        const existing = await prisma.coupon.findUnique({
            where: { id },
            include: {
                _count: { select: { redemptions: true } },
            },
        })

        if (!existing) {
            return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
        }

        // Rule: Never hard-delete a coupon that has redemptions. Deactivate instead.
        if (existing._count.redemptions > 0) {
            const deactivated = await prisma.coupon.update({
                where: { id },
                data: { isActive: false },
            })
            // B10: the early return used to skip invalidation, so the cached promo
            // badges (tagged "coupons"/"courses", 30s) kept advertising this coupon.
            safeRevalidateTags(CACHE_TAGS.coupons, CACHE_TAGS.courses)
            return NextResponse.json({
                success: true,
                message: "Coupon has existing redemptions and was deactivated instead of deleted.",
                coupon: deactivated,
            })
        }

        await prisma.coupon.delete({ where: { id } })
        safeRevalidateTags(CACHE_TAGS.coupons, CACHE_TAGS.courses)
        return NextResponse.json({ success: true, message: "Coupon deleted successfully." })
    } catch (err: any) {
        console.error("Admin coupons DELETE error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
