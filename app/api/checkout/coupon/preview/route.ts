import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { validateCoupon } from "@/lib/coupons"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        const ip = getClientIp(req)
        const rateLimitKey = session?.user?.id 
            ? `user_${session.user.id}:coupon_preview` 
            : `ip_${ip}:coupon_preview`

        const rl = await checkRateLimit(rateLimitKey, 10, 60)
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many requests. Please wait a moment." },
                { status: 429 }
            )
        }

        const body = await req.json().catch(() => ({}))
        const { courseId, code } = body

        if (!courseId || !code) {
            return NextResponse.json(
                { error: "Invalid or expired coupon" },
                { status: 400 }
            )
        }

        const result = await validateCoupon({
            code,
            courseId,
            userId: session?.user?.id,
            userRole: session?.user?.role,
        })

        if (!result.valid) {
            const status = result.adminReason === "Course not found or invisible" ? 404 : 400
            return NextResponse.json(
                { error: "Invalid or expired coupon" },
                { status }
            )
        }

        return NextResponse.json({
            success: true,
            code: result.coupon.code,
            originalPaise: result.originalPricePaise,
            discountPaise: result.discountPaise,
            finalPaise: result.finalPricePaise,
        })
    } catch (err: any) {
        console.error("Error in coupon preview:", err)
        return NextResponse.json(
            { error: "Invalid or expired coupon" },
            { status: 400 }
        )
    }
}
