import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { validateCoupon } from "@/lib/coupons"

// In-memory rate limiting map: ip/userId -> timestamps[]
const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(key: string, limit = 15, windowMs = 10000): boolean {
    const now = Date.now()
    const timestamps = rateLimitMap.get(key) || []
    const valid = timestamps.filter((t) => now - t < windowMs)
    if (valid.length >= limit) {
        return false
    }
    valid.push(now)
    rateLimitMap.set(key, valid)
    return true
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown_ip"
        const rateLimitKey = session?.user?.id ? `user_${session.user.id}` : `ip_${ip}`

        if (!checkRateLimit(rateLimitKey)) {
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
            return NextResponse.json(
                { error: "Invalid or expired coupon" },
                { status: 400 }
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
