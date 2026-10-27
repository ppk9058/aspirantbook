import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/payments/stripe"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
        console.error("Stripe webhook secret is not configured; failing closed")
        return NextResponse.json(
            { error: "Webhook secret not configured" },
            { status: 500 }
        )
    }

    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
        return NextResponse.json(
            { error: "No signature" },
            { status: 400 }
        )
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret
        )
    } catch (error) {
        console.error("Webhook signature verification failed:", error)
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
        )
    }

    try {
        // Idempotency by Stripe event id. A replay of an already-processed
        // event is acknowledged without touching money or entitlements.
        const alreadyProcessed = await prisma.stripeWebhookEvent.findUnique({
            where: { eventId: event.id },
        })
        if (alreadyProcessed) {
            return NextResponse.json({ received: true, duplicate: true })
        }

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session
                await handleCheckoutCompleted(session)
                break
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionUpdated(subscription)
                break
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionDeleted(subscription)
                break
            }

            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice
                await handlePaymentSucceeded(invoice)
                break
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice
                await handlePaymentFailed(invoice)
                break
            }
        }

        // Record the event only after the handlers succeeded, so a failed
        // handler is retried by Stripe instead of being silently swallowed.
        await prisma.stripeWebhookEvent
            .create({ data: { eventId: event.id, type: event.type } })
            .catch((err: any) => {
                if (err?.code === "P2002") return
                throw err
            })

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error("Webhook handler error:", error)
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        )
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId || session.client_reference_id

    if (!userId) {
        console.error("No user ID in checkout session")
        return
    }

    const subscriptionId = session.subscription as string

    if (!subscriptionId) {
        console.error("No subscription ID in checkout session")
        return
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const plan = getPlanFromPriceId(subscription.items.data[0].price.id)

    // providerId is unique, so a retried checkout can never create a second
    // subscription. A concurrent duplicate is treated as already handled.
    let newSubscription: { id: string }
    try {
        newSubscription = await prisma.subscription.create({
            data: {
                userId,
                plan,
                status: "ACTIVE",
                provider: "STRIPE",
                providerId: subscriptionId,
                startDate: new Date(subscription.current_period_start * 1000),
                endDate: new Date(subscription.current_period_end * 1000),
            },
        })
    } catch (err: any) {
        if (err?.code === "P2002") return
        throw err
    }

    // Create initial payment record (idempotent on the Stripe payment id)
    const externalId = (session.payment_intent as string) || session.id
    const amount = session.amount_total ? session.amount_total / 100 : 0
    await prisma.payment.upsert({
        where: { externalId },
        update: {},
        create: {
            userId,
            subscriptionId: newSubscription.id,
            amount,
            amountMinor: typeof session.amount_total === "number" ? session.amount_total : Math.round(amount * 100),
            currency: session.currency?.toUpperCase() || "USD",
            status: "COMPLETED",
            paymentMethod: "card",
            paymentProvider: "stripe",
            externalId,
        },
    })

    // Update user role to PREMIUM
    await prisma.user.update({
        where: { id: userId },
        data: { role: "PREMIUM" },
    })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const plan = getPlanFromPriceId(subscription.items.data[0].price.id)

    await prisma.subscription.updateMany({
        where: { providerId: subscription.id },
        data: {
            plan,
            status: subscription.status === "active" ? "ACTIVE" : "PAST_DUE",
            endDate: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
    })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findFirst({
        where: { providerId: subscription.id },
    })

    if (!dbSubscription) return

    await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: { status: "CANCELED" },
    })

    // Downgrade user to FREE
    await prisma.user.update({
        where: { id: dbSubscription.userId },
        data: { role: "FREE" },
    })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string

    if (!subscriptionId) return

    const dbSubscription = await prisma.subscription.findFirst({
        where: { providerId: subscriptionId },
    })

    if (!dbSubscription) return

    // A failure recorded earlier under the same invoice must not block the
    // success: upgrade the row in place instead of returning early.
    const existingPayment = await prisma.payment.findUnique({
        where: { externalId: invoice.id }
    })

    if (existingPayment) {
        if (existingPayment.status !== "COMPLETED") {
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                    status: "COMPLETED",
                    amount: invoice.amount_paid / 100,
                    amountMinor: invoice.amount_paid,
                },
            })
        }
    } else {
        await prisma.payment.create({
            data: {
                userId: dbSubscription.userId,
                subscriptionId: dbSubscription.id,
                amount: invoice.amount_paid / 100,
                amountMinor: invoice.amount_paid,
                currency: invoice.currency.toUpperCase(),
                status: "COMPLETED",
                paymentProvider: "stripe",
                externalId: invoice.id,
                metadata: {
                    invoiceUrl: invoice.hosted_invoice_url,
                },
            },
        })
    }

    // A successful invoice always restores access, regardless of whether a
    // failure row was written before it.
    await prisma.subscription.updateMany({
        where: { providerId: subscriptionId },
        data: { status: "ACTIVE" },
    })
    await prisma.user.update({
        where: { id: dbSubscription.userId },
        data: { role: "PREMIUM" },
    })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string

    if (!subscriptionId) return

    const dbSubscription = await prisma.subscription.findFirst({
        where: { providerId: subscriptionId },
    })

    if (!dbSubscription) return

    // Never use the bare invoice id here: that is the same key a later
    // invoice.payment_succeeded stores, and it would suppress the success.
    const externalId = `${invoice.id}:failed`

    await prisma.payment.upsert({
        where: { externalId },
        update: {},
        create: {
            userId: dbSubscription.userId,
            subscriptionId: dbSubscription.id,
            amount: invoice.amount_due / 100,
            amountMinor: invoice.amount_due,
            currency: invoice.currency.toUpperCase(),
            status: "FAILED",
            paymentProvider: "stripe",
            externalId,
        },
    })
}

function getPlanFromPriceId(priceId: string): "MONTHLY" | "YEARLY" {
    if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
        return "MONTHLY"
    }
    if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
        return "YEARLY"
    }
    return "MONTHLY" // Default fallback
}
