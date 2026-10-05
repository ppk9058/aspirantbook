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
            const orderId = payment?.order_id || event.payload?.order?.entity?.id

            if (!orderId) {
                console.error("Missing orderId in Razorpay payment webhook payload")
                return NextResponse.json({ received: true, warning: "Missing order_id; enrollment skipped" })
            }

            // Derive user + course ONLY from our own DB record created server-side for razorpay_order_id.
            // Notes from the browser or payment payload are IGNORED for identity.
            const orderRecord = await prisma.payment.findFirst({
                where: {
                    OR: [
                        { externalId: orderId },
                        { metadata: { path: ["orderId"], equals: orderId } },
                    ],
                },
            })

            // If the order record doesn't exist, return 200 and log without enrolling.
            if (!orderRecord) {
                console.warn(`Unknown order record for order_id "${orderId}"; skipping enrollment`)
                return NextResponse.json({ received: true, warning: "Unknown order record; enrollment skipped" })
            }

            const meta = (orderRecord.metadata as any) || {}
            const userId = orderRecord.userId
            const courseId = meta.courseId
            const plan = meta.plan as "MONTHLY" | "YEARLY" | "COURSE" | undefined

            // Compare payment.amount and currency to that DB record
            const expectedPaise = meta.amountPaise ?? Math.round(orderRecord.amount * 100)
            if (payment?.amount && payment.amount !== expectedPaise) {
                console.error(`Amount mismatch in webhook: expected=${expectedPaise}, got=${payment.amount}; skipping enrollment`)
                return NextResponse.json({ received: true, warning: "Amount mismatch; enrollment skipped" })
            }

            if (payment?.currency && orderRecord.currency && payment.currency.toUpperCase() !== orderRecord.currency.toUpperCase()) {
                console.error(`Currency mismatch in webhook: expected=${orderRecord.currency}, got=${payment.currency}; skipping enrollment`)
                return NextResponse.json({ received: true, warning: "Currency mismatch; enrollment skipped" })
            }

            // Verify user exists in database
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, role: true },
            })
            if (!user) {
                console.error("User in order record not found in database:", userId)
                return NextResponse.json({ received: true, warning: "User not found" })
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

                    // Update payment record to COMPLETED idempotently
                    try {
                        const completedPaymentId = payment?.id || `pay_${orderId}`
                        await prisma.payment.updateMany({
                            where: { id: orderRecord.id },
                            data: {
                                status: "COMPLETED",
                                externalId: completedPaymentId,
                                paymentMethod: payment?.method || "razorpay",
                                amount: payment?.amount ? payment.amount / 100 : orderRecord.amount,
                                metadata: {
                                    ...meta,
                                    paymentId: completedPaymentId,
                                    orderId,
                                    courseId: course.id,
                                    courseTitle: course.title,
                                    courseSlug: course.slug,
                                    capturedAt: new Date().toISOString(),
                                },
                            },
                        })

                        await prisma.couponRedemption.updateMany({
                            where: {
                                paymentId: orderRecord.id,
                                status: "RESERVED",
                            },
                            data: {
                                status: "REDEEMED",
                            },
                        })
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

                const completedPaymentId = payment?.id || `pay_${orderId}`
                await prisma.payment.updateMany({
                    where: { id: orderRecord.id },
                    data: {
                        status: "COMPLETED",
                        externalId: completedPaymentId,
                        subscriptionId: subscription.id,
                        paymentMethod: payment?.method || "razorpay",
                        amount: payment?.amount ? payment.amount / 100 : orderRecord.amount,
                        metadata: {
                            ...meta,
                            paymentId: completedPaymentId,
                            orderId,
                            capturedAt: new Date().toISOString(),
                        },
                    },
                })

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
