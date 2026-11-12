import Razorpay from "razorpay"
import crypto from "crypto"

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn("Razorpay credentials not configured")
}

export const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    : null

export async function createRazorpayOrder({
    amount,
    currency = "INR",
    receipt,
    notes,
}: {
    amount: number
    currency?: string
    receipt: string
    notes?: Record<string, string>
}) {
    if (!razorpay) {
        throw new Error("Razorpay not configured")
    }

    const order = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency,
        receipt,
        notes,
    })

    return order
}

export async function createRazorpaySubscription({
    planId,
    totalCount,
    customerId,
    notes,
}: {
    planId: string
    totalCount?: number
    customerId?: string
    notes?: Record<string, string>
}) {
    if (!razorpay) {
        throw new Error("Razorpay not configured")
    }

    const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: totalCount ?? 12,
        customer_notify: 1,
        notes,
    })

    return subscription
}

export async function cancelRazorpaySubscription(subscriptionId: string) {
    if (!razorpay) {
        throw new Error("Razorpay not configured")
    }

    const subscription = await razorpay.subscriptions.cancel(subscriptionId)
    return subscription
}

export function verifyRazorpaySignature({
    orderId,
    paymentId,
    signature,
}: {
    orderId: string
    paymentId: string
    signature: string
}): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
        console.error("RAZORPAY_KEY_SECRET is not configured; cannot verify payment signature")
        return false
    }

    const text = `${orderId}|${paymentId}`
    const generated = crypto.createHmac("sha256", secret).update(text).digest("hex")

    const expected = Buffer.from(generated, "utf8")
    const received = Buffer.from(signature, "utf8")
    if (expected.length !== received.length) return false
    return crypto.timingSafeEqual(expected, received)
}

export function verifyRazorpayWebhookSignature(
    body: string,
    signature: string
): boolean {
    // Webhook signatures use RAZORPAY_WEBHOOK_SECRET only. RAZORPAY_KEY_SECRET is a
    // different credential and must never be used as a fallback.
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret || !signature) return false
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex")

    const expected = Buffer.from(expectedSignature, "utf8")
    const received = Buffer.from(signature, "utf8")
    if (expected.length !== received.length) return false
    return crypto.timingSafeEqual(expected, received)
}
