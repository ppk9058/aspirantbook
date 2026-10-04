"use server"

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { stripe } from "@/lib/payments/stripe"

export async function createCheckoutSession(plan: "MONTHLY" | "YEARLY") {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const priceId = plan === "MONTHLY"
        ? process.env.STRIPE_MONTHLY_PRICE_ID
        : process.env.STRIPE_YEARLY_PRICE_ID

    if (!priceId) {
        throw new Error("Price ID not configured")
    }

    const checkoutSession = await stripe.checkout.sessions.create({
        customer_email: session.user.email,
        metadata: {
            userId: session.user.id,
            plan: plan,
        },
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?canceled=true`,
        allow_promotion_codes: true,
        billing_address_collection: "required",
    })

    if (!checkoutSession.url) {
        throw new Error("Failed to create checkout session")
    }

    redirect(checkoutSession.url)
}
