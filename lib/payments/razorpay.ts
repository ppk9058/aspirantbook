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

// Plan prices in INR
export const RAZORPAY_PLANS = {
    MONTHLY: 1499, // ₹1,499/month (~$19)
    YEARLY: 14999, // ₹14,999/year (~$190, 17% discount)
}

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
    const text = `${orderId}|${paymentId}`
    const generated = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(text)
        .digest("hex")

    return generated === signature
}

export function verifyRazorpayWebhookSignature(
    body: string,
    signature: string
): boolean {
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(body)
        .digest("hex")

    return expectedSignature === signature
}
