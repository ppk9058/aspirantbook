import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_for_build"

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia" as any,
    typescript: true,
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
    const session = await stripe.checkout.sessions.create({
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
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return subscription
}

export async function updateSubscription(
    subscriptionId: string,
    newPriceId: string
) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
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
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
}
