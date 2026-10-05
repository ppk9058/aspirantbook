"use server"

import { auth } from "@/auth"
import Razorpay from "razorpay"
import { prisma } from "@/lib/prisma"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder",
})

export interface CreateOrderParams {
    plan?: "MONTHLY" | "YEARLY"
    amount?: number // in INR Rupees (optional, verified server-side)
    courseId?: string
    courseTitle?: string
    userId?: string
    couponCode?: string
}

export async function createRazorpayOrder(params: CreateOrderParams | "MONTHLY" | "YEARLY") {
    let session: any = null
    try {
        session = await auth()
    } catch {
        // Outside request scope
    }

    const isSimplePlan = typeof params === "string"
    const plan = isSimplePlan ? params : params.plan
    const courseId = isSimplePlan ? undefined : params.courseId
    const couponCode = isSimplePlan ? undefined : params.couponCode?.trim().toUpperCase()
    const explicitUserId = isSimplePlan ? undefined : params.userId

    const userId = session?.user?.id || explicitUserId

    if (!userId) {
        throw new Error("User must be logged in to create a payment order.")
    }

    let amountInPaise: number
    let resolvedCourse: { id: string; price: number | null; isPremium: boolean } | null = null

    // Server-side authoritative price determination
    if (courseId) {
        const course = await prisma.course.findFirst({
            where: {
                OR: [{ id: courseId }, { slug: courseId }],
            },
            select: { id: true, price: true, isPremium: true, status: true, isPublished: true },
        })

        if (!course || !isCourseVisibleToUser(course, session?.user?.role)) {
            throw new Error("Course not found for payment order.")
        }

        resolvedCourse = course
        const effectiveCoursePrice = course.price ?? 0

        if (effectiveCoursePrice <= 0 && !course.isPremium) {
            throw new Error("Cannot create payment order for free course.")
        }

        // Validate coupon code strictly on the server
        let discountPercent = 0
        if (couponCode === "DEMO30") {
            discountPercent = 30
        }

        const discountedPrice = discountPercent > 0
            ? Math.round(effectiveCoursePrice * (1 - discountPercent / 100))
            : effectiveCoursePrice

        amountInPaise = Math.round(discountedPrice * 100)
    } else if (plan === "YEARLY") {
        amountInPaise = 499900 // ₹4,999
    } else {
        amountInPaise = 49900 // ₹499
    }

    const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${userId.slice(-6)}_${Date.now()}`,
        notes: {
            userId: userId,
            courseId: resolvedCourse?.id || courseId || "",
            plan: plan || (courseId ? "COURSE" : "MONTHLY"),
        },
    }

    try {
        const order = await razorpay.orders.create(options)

        // Persist server-side order record for payment trust & webhook fulfillment
        try {
            await prisma.payment.create({
                data: {
                    userId,
                    amount: Number(order.amount) / 100,
                    currency: order.currency || "INR",
                    status: "PENDING",
                    paymentProvider: "RAZORPAY",
                    externalId: order.id,
                    metadata: {
                        orderId: order.id,
                        courseId: resolvedCourse?.id || courseId || null,
                        plan: plan || (courseId ? "COURSE" : "MONTHLY"),
                        amountPaise: order.amount,
                        couponCode: couponCode || null,
                    },
                },
            })
        } catch (dbErr) {
            console.error("Failed to persist server-side payment order record:", dbErr)
        }

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID!,
        }
    } catch (error) {
        console.error("Razorpay order creation failed:", error)
        throw new Error("Failed to create Razorpay order")
    }
}

