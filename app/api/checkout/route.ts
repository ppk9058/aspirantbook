import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createCheckoutSession } from "@/lib/payments/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const formData = await request.formData()
        const priceId = formData.get("priceId") as string

        if (!priceId) {
            return NextResponse.json(
                { error: "Price ID is required" },
                { status: 400 }
            )
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

        const checkoutSession = await createCheckoutSession({
            userId: user.id,
            userEmail: user.email,
            priceId,
            successUrl: `${baseUrl}/settings/subscription?success=true`,
            cancelUrl: `${baseUrl}/pricing?canceled=true`,
        })

        return NextResponse.redirect(checkoutSession.url!)
    } catch (error) {
        console.error("Checkout error:", error)
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        )
    }
}
