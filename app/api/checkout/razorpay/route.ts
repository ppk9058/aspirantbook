import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createRazorpayOrder, RAZORPAY_PLANS } from "@/lib/payments/razorpay"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const { plan } = await request.json()

        if (!plan || !["MONTHLY", "YEARLY"].includes(plan)) {
            return NextResponse.json(
                { error: "Invalid plan" },
                { status: 400 }
            )
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        const amount = RAZORPAY_PLANS[plan as keyof typeof RAZORPAY_PLANS]

        const order = await createRazorpayOrder({
            amount,
            currency: "INR",
            receipt: `order_${user.id}_${Date.now()}`,
            notes: {
                userId: user.id,
                plan,
                email: user.email,
            },
        })

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        })
    } catch (error) {
        console.error("Razorpay checkout error:", error)
        return NextResponse.json(
            { error: "Failed to create order" },
            { status: 500 }
        )
    }
}
