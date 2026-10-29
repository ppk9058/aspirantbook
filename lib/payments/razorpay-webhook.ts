import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fulfilPaymentOrder } from "@/lib/payments/fulfilment"
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay"

/**
 * Canonical Razorpay webhook handler.
 *
 * Both /api/webhooks/razorpay and /api/razorpay/webhook delegate here so there is
 * exactly one code path, one signature check and one idempotent fulfilment flow.
 */
export async function handleRazorpayWebhook(request: NextRequest): Promise<NextResponse> {
    const body = await request.text()
    const signature = request.headers.get("x-razorpay-signature")

    if (!signature) {
        return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Webhook signature verification uses RAZORPAY_WEBHOOK_SECRET only.
    // Never fall back to RAZORPAY_KEY_SECRET: it is a different credential and would
    // silently reject every legitimate webhook.
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        console.error("Razorpay webhook secret is not configured; failing closed")
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    // Verify the signature against the raw request body before any parsing or DB write.
    if (!verifyRazorpayWebhookSignature(body, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    let event: any
    try {
        event = JSON.parse(body)
    } catch (error) {
        console.error("Razorpay webhook received malformed JSON", error)
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    // Replay window check: reject events whose timestamp is older than 5 minutes
    if (event.created_at) {
        const eventTimeSec = typeof event.created_at === "number" ? event.created_at : Number.parseInt(event.created_at, 10)
        if (!Number.isNaN(eventTimeSec)) {
            const eventTimeMs = eventTimeSec > 1e11 ? eventTimeSec : eventTimeSec * 1000
            const nowMs = Date.now()
            const ageMs = nowMs - eventTimeMs
            const MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes
            if (ageMs > MAX_AGE_MS || ageMs < -60000) {
                console.warn(`[RazorpayWebhook] Rejected event outside 5-minute replay window: age=${Math.round(ageMs / 1000)}s`)
                return NextResponse.json({ error: "Webhook event timestamp outside acceptable 5-minute replay window" }, { status: 400 })
            }
        }
    }

    // Idempotency: extract unique event ID and deduplicate via RazorpayWebhookEvent table
    const payment = event.payload?.payment?.entity || event.payload?.order?.entity
    const orderId = payment?.order_id || event.payload?.order?.entity?.id
    const eventId =
        request.headers.get("x-razorpay-event-id") ||
        event.id ||
        event.event_id ||
        (payment?.id ? `${event.event}_${payment.id}` : null)

    let persistedEvent = false
    if (eventId) {
        try {
            await prisma.razorpayWebhookEvent.create({
                data: {
                    eventId,
                    eventType: event.event || "unknown",
                    payload: event,
                },
            })
            persistedEvent = true
        } catch (err: any) {
            if (err?.code === "P2002" || err?.message?.includes("Unique constraint")) {
                console.log(`[RazorpayWebhook] Duplicate webhook event ${eventId} ignored`)
                return NextResponse.json({ received: true, duplicate: true, eventId }, { status: 200 })
            }
            console.warn("[RazorpayWebhook] Could not persist RazorpayWebhookEvent, proceeding:", err)
        }
    }

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

            // If the order record doesn't exist, check if it's a BookOrder
            if (!orderRecord) {
                const { getOrderByRazorpayId, markBookOrderCompleted } = await import("@/lib/books/bookService")
                const bookOrder = await getOrderByRazorpayId(orderId)
                if (bookOrder) {
                    await markBookOrderCompleted({
                        orderId: bookOrder.id,
                        razorpayPaymentId: payment?.id || "webhook_captured",
                    })
                    return NextResponse.json({ received: true, processed: "book_order" })
                }
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

            // Fulfill payment and enrollment atomically and idempotently via shared fulfilment function
            const completedPaymentId = payment?.id || `pay_${orderId}`
            const fulfillRes = await fulfilPaymentOrder({
                orderId,
                paymentId: completedPaymentId,
                courseId,
                plan,
                amountPaise: payment?.amount,
                currency: payment?.currency,
                paymentMethod: payment?.method || "razorpay",
                currentUserId: userId,
            })

            if (!fulfillRes.success) {
                console.error("Webhook fulfillment failed:", fulfillRes.error)
                return NextResponse.json({ received: true, warning: fulfillRes.error })
            }
        } else if (event.event === "payment.failed") {
            const payment = event.payload?.payment?.entity
            const orderId = payment?.order_id
            if (orderId) {
                const orderRecord = await prisma.payment.findFirst({
                    where: {
                        OR: [
                            { externalId: orderId },
                            { metadata: { path: ["orderId"], equals: orderId } },
                        ],
                    },
                })
                if (orderRecord) {
                    await prisma.payment.updateMany({
                        where: { id: orderRecord.id, status: "PENDING" },
                        data: { status: "FAILED" },
                    })
                    // Release reserved coupon
                    await prisma.couponRedemption.updateMany({
                        where: { paymentId: orderRecord.id, status: "RESERVED" },
                        data: { status: "RELEASED" },
                    })
                }
            }
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        if (persistedEvent && eventId) {
            await prisma.razorpayWebhookEvent.delete({ where: { eventId } }).catch(() => {})
        }
        console.error("Razorpay webhook error:", error)
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
    }
}
