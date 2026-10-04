import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(request: NextRequest) {
    const body = await request.text()
    const signature = request.headers.get("x-razorpay-signature")

    if (!signature) {
        return NextResponse.json(
            { error: "No signature" },
            { status: 400 }
        )
    }

    // Verify signature
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(body)
        .digest("hex")

    if (expectedSignature !== signature) {
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
        )
    }

    const event = JSON.parse(body)

    try {
        if (event.event === "payment.captured") {
            const payment = event.payload.payment.entity
            const orderId = payment.order_id
            const notes = payment.notes
            const userId = notes.userId
            const plan = notes.plan as "MONTHLY" | "YEARLY"

            if (!userId || !plan) {
                console.error("Missing metadata in Razorpay payment")
                return NextResponse.json({ received: true })
            }

            // Create subscription
            const subscription = await prisma.subscription.create({
                data: {
                    userId,
                    plan,
                    status: "ACTIVE",
                    provider: "RAZORPAY",
                    providerId: orderId, // Using order ID as subscription ID for one-time payments
                    startDate: new Date(),
                    endDate: new Date(Date.now() + (plan === "MONTHLY" ? 30 : 365) * 24 * 60 * 60 * 1000),
                },
            })

            // Create payment record
            await prisma.payment.create({
                data: {
                    userId,
                    subscriptionId: subscription.id,
                    amount: payment.amount / 100,
                    currency: payment.currency,
                    status: "COMPLETED",
                    paymentMethod: payment.method,
                    paymentProvider: "razorpay",
                    externalId: payment.id,
                },
            })

            // Update user role
            await prisma.user.update({
                where: { id: userId },
                data: { role: "PREMIUM" },
            })
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error("Razorpay webhook error:", error)
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        )
    }
}
