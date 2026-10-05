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

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!webhookSecret) {
        console.error("Razorpay webhook secret is not configured; failing closed")
        return NextResponse.json(
            { error: "Webhook secret not configured" },
            { status: 500 }
        )
    }

    // Verify signature
    let isValid = false
    try {
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(body)
            .digest("hex")
        isValid = (expectedSignature === signature)
    } catch (err) {
        console.error("Error computing webhook signature:", err)
    }

    if (!isValid) {
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
        )
    }

    const event = JSON.parse(body)

    try {
        if (event.event === "payment.captured" || event.event === "order.paid") {
            const payment = event.payload?.payment?.entity || event.payload?.order?.entity
            const orderId = payment?.order_id || event.payload?.order?.entity?.id || payment?.id
            const notes = event.payload?.payment?.entity?.notes || event.payload?.order?.entity?.notes || {}
            const userId = notes.userId
            const courseId = notes.courseId
            const plan = notes.plan as "MONTHLY" | "YEARLY" | "COURSE" | undefined

            if (!userId) {
                console.error("Missing userId in Razorpay payment webhook notes")
                return NextResponse.json({ received: true })
            }

            // Verify user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true },
            })
            if (!user) {
                console.error("User in webhook not found:", userId)
                return NextResponse.json({ received: true })
            }

            // Case A: Course Enrollment Fulfillment
            if (courseId) {
                const course = await prisma.course.findFirst({
                    where: {
                        OR: [{ id: courseId }, { slug: courseId }],
                    },
                    select: { id: true, title: true, slug: true, price: true },
                })

                if (course) {
                    // Check if payment amount matches order amount (prevent underpayment/tampering)
                    const orderEntity = event.payload?.order?.entity
                    const isAmountMismatch = Boolean(orderEntity?.amount && payment.amount && orderEntity.amount !== payment.amount)

                    if (isAmountMismatch) {
                        console.error(`Amount mismatch in webhook: order=${orderEntity.amount}, payment=${payment.amount}; skipping enrollment`)
                        return NextResponse.json({ received: true, warning: "Amount mismatch; enrollment skipped" })
                    }

                    // Create enrollment idempotently
                    try {
                        await prisma.enrollment.upsert({
                            where: {
                                userId_courseId: {
                                    userId: user.id,
                                    courseId: course.id,
                                },
                            },
                            update: {},
                            create: {
                                userId: user.id,
                                courseId: course.id,
                            },
                        })
                    } catch (e: any) {
                        if (e.code !== "P2002") throw e
                    }

                    // Record payment record idempotently
                    try {
                        const existingPayment = await prisma.payment.findFirst({
                            where: { externalId: payment.id },
                        })
                        if (!existingPayment) {
                            await prisma.payment.create({
                                data: {
                                    userId: user.id,
                                    amount: payment.amount ? payment.amount / 100 : (course.price ?? 0),
                                    currency: payment.currency || "INR",
                                    status: "COMPLETED",
                                    paymentMethod: payment.method || "card",
                                    paymentProvider: "razorpay",
                                    externalId: payment.id,
                                    metadata: {
                                        orderId,
                                        courseId: course.id,
                                        courseTitle: course.title,
                                        courseSlug: course.slug,
                                    },
                                },
                            })
                        }
                    } catch (e: any) {
                        if (e.code !== "P2002") throw e
                    }
                }
            } else if (plan === "MONTHLY" || plan === "YEARLY") {
                // Case B: Subscription Plan Fulfillment
                let subscription = await prisma.subscription.findFirst({
                    where: { providerId: orderId, userId: user.id },
                })

                if (!subscription) {
                    subscription = await prisma.subscription.create({
                        data: {
                            userId: user.id,
                            plan,
                            status: "ACTIVE",
                            provider: "RAZORPAY",
                            providerId: orderId,
                            startDate: new Date(),
                            endDate: new Date(Date.now() + (plan === "MONTHLY" ? 30 : 365) * 24 * 60 * 60 * 1000),
                        },
                    })
                }

                const existingPayment = await prisma.payment.findFirst({
                    where: { externalId: payment.id },
                })
                if (!existingPayment) {
                    await prisma.payment.create({
                        data: {
                            userId: user.id,
                            subscriptionId: subscription.id,
                            amount: payment.amount / 100,
                            currency: payment.currency || "INR",
                            status: "COMPLETED",
                            paymentMethod: payment.method || "card",
                            paymentProvider: "razorpay",
                            externalId: payment.id,
                        },
                    })
                }

                await prisma.user.update({
                    where: { id: user.id },
                    data: { role: "PREMIUM" },
                })
            }
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
