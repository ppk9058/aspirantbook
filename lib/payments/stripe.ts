import Stripe from "stripe"

let _stripeInstance: Stripe | null = null

export function isStripeConfigured(): boolean {
    const key = process.env.STRIPE_SECRET_KEY
    return Boolean(key && key.trim() !== "")
}

export function getStripeClient(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key || key.trim() === "") {
        throw new Error("Stripe is not configured: STRIPE_SECRET_KEY is missing")
    }

    if (!_stripeInstance) {
        _stripeInstance = new Stripe(key, {
            apiVersion: "2025-02-24.acacia" as any,
            typescript: true,
        })
    }
    return _stripeInstance
}

// Lazy Proxy for backward-compatible `import { stripe } from "@/lib/payments/stripe"`
// Import time evaluation will NOT throw during build phase (NEXT_PHASE=phase-production-build)
// Calling any method/property at runtime without STRIPE_SECRET_KEY fails closed.
export const stripe = new Proxy({} as Stripe, {
    get(_target, prop, receiver) {
        const client = getStripeClient()
        const value = Reflect.get(client, prop, receiver)
        if (typeof value === "function") {
            return value.bind(client)
        }
        return value
    },
})

// Price IDs for subscription plans (set these in Stripe Dashboard)
export const STRIPE_PLANS = {
    MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID || "",
    YEARLY: process.env.STRIPE_YEARLY_PRICE_ID || "",
}

export async function createCheckoutSession({
    userId,
    userEmail,
    priceId,
    successUrl,
    cancelUrl,
}: {
    userId: string
    userEmail: string
    priceId: string
    successUrl: string
    cancelUrl: string
}) {
    const client = getStripeClient()
    const session = await client.checkout.sessions.create({
        customer_email: userEmail,
        client_reference_id: userId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            userId,
        },
    })

    return session
}

export async function cancelSubscription(subscriptionId: string) {
    const client = getStripeClient()
    const subscription = await client.subscriptions.cancel(subscriptionId)
    return subscription
}

export async function updateSubscription(
    subscriptionId: string,
    newPriceId: string
) {
    const client = getStripeClient()
    const subscription = await client.subscriptions.retrieve(subscriptionId)

    const updatedSubscription = await client.subscriptions.update(subscriptionId, {
        items: [
            {
                id: subscription.items.data[0].id,
                price: newPriceId,
            },
        ],
        proration_behavior: "create_prorations",
    })

    return updatedSubscription
}

export async function getSubscription(subscriptionId: string) {
    const client = getStripeClient()
    const subscription = await client.subscriptions.retrieve(subscriptionId)
    return subscription
}
