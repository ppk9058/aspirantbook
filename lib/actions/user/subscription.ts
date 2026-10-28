"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { toMinorUnits } from "@/lib/money"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function upgradeSubscription(plan: "MONTHLY" | "YEARLY") {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const endDate = new Date()
    if (plan === "MONTHLY") {
        endDate.setMonth(endDate.getMonth() + 1)
    } else {
        endDate.setFullYear(endDate.getFullYear() + 1)
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
        data: {
            userId: session.user.id,
            plan: plan,
            status: "ACTIVE",
            provider: "STRIPE", // Mock provider
            providerId: `sub_mock_${Date.now()}`,
            startDate: new Date(),
            endDate: endDate,
        },
    })

    // Create payment record
    await prisma.payment.create({
        data: {
            userId: session.user.id,
            subscriptionId: subscription.id,
            amount: plan === "MONTHLY" ? 499 : 4999,
            // B7: dual-write the exact minor-unit amount
            amountMinor: toMinorUnits(plan === "MONTHLY" ? 499 : 4999, "INR"),
            currency: "INR",
            status: "COMPLETED",
            paymentMethod: "card",
            paymentProvider: "stripe_mock",
            externalId: `pay_mock_${Date.now()}`,
        },
    })

    // Update user role
    await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "PREMIUM" },
    })

    revalidatePath("/subscription")
    revalidatePath("/profile")

    return { success: true }
}
