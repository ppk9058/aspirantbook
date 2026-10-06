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
    let couponValidation: {
        coupon: any
        originalPaise: number
        discountPaise: number
        finalPaise: number
        tempPaymentId?: string
        redemptionId?: string
    } | null = null

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

        // Check if user is already enrolled
        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: course.id,
                },
            },
        })
        if (existingEnrollment) {
            throw new Error("User is already enrolled in this course.")
        }

        if (effectiveCoursePrice <= 0 && !course.isPremium) {
            throw new Error("Cannot create payment order for free course.")
        }

        if (couponCode) {
            // Lock and validate coupon in transaction
            const validation = await prisma.$transaction(async (tx) => {
                const rows: any[] = await tx.$queryRaw`SELECT * FROM "Coupon" WHERE code = ${couponCode} FOR UPDATE`
                if (!rows || rows.length === 0) {
                    throw new Error("Invalid or expired coupon")
                }
                const couponRow = rows[0]
                if (!couponRow.isActive) {
                    throw new Error("Invalid or expired coupon")
                }
                const now = new Date()
                if (couponRow.validFrom && now < new Date(couponRow.validFrom)) {
                    throw new Error("Invalid or expired coupon")
                }
                if (couponRow.validUntil && now > new Date(couponRow.validUntil)) {
                    throw new Error("Invalid or expired coupon")
                }
                if (couponRow.courseId && couponRow.courseId !== course.id) {
                    throw new Error("Invalid or expired coupon")
                }

                // Check redemptions count
                const activeRedemptions = await tx.couponRedemption.count({
                    where: {
                        couponId: couponRow.id,
                        OR: [
                            { status: "REDEEMED" },
                            { status: "RESERVED", expiresAt: { gt: now } },
                        ],
                    },
                })
                if (couponRow.maxRedemptions !== null && activeRedemptions >= couponRow.maxRedemptions) {
                    throw new Error("Invalid or expired coupon")
                }

                // Check per-user limit
                const userRedemptions = await tx.couponRedemption.count({
                    where: {
                        couponId: couponRow.id,
                        userId,
                        OR: [
                            { status: "REDEEMED" },
                            { status: "RESERVED", expiresAt: { gt: now } },
                        ],
                    },
                })
                if (userRedemptions >= couponRow.perUserLimit) {
                    throw new Error("Invalid or expired coupon")
                }

                const originalPaise = Math.round(effectiveCoursePrice * 100)
                let discPaise = 0
                if (couponRow.discountType === "PERCENT") {
                    discPaise = Math.floor((originalPaise * couponRow.discountValue) / 100)
                    if (couponRow.maxDiscountAmount) {
                        discPaise = Math.min(discPaise, Math.round(Number(couponRow.maxDiscountAmount) * 100))
                    }
                } else if (couponRow.discountType === "FLAT") {
                    discPaise = Math.round(Number(couponRow.discountValue) * 100)
                    discPaise = Math.min(discPaise, originalPaise)
                }

                const finalPaise = originalPaise - discPaise
                if (finalPaise < 100) {
                    throw new Error("Invalid or expired coupon")
                }

                // Reserve redemption atomically inside the FOR UPDATE lock
                const tempPayment = await tx.payment.create({
                    data: {
                        userId,
                        amount: finalPaise / 100,
                        currency: "INR",
                        status: "PENDING",
                        paymentProvider: "RAZORPAY",
                        externalId: `temp_order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        couponId: couponRow.id,
                        couponCode: couponRow.code,
                        originalAmount: originalPaise / 100,
                        discountAmount: discPaise / 100,
                    },
                })

                const redemption = await tx.couponRedemption.create({
                    data: {
                        couponId: couponRow.id,
                        userId,
                        courseId: course.id,
                        paymentId: tempPayment.id,
                        status: "RESERVED",
                        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
                    },
                })

                return {
                    coupon: couponRow,
                    originalPaise,
                    discountPaise: discPaise,
                    finalPaise,
                    tempPaymentId: tempPayment.id,
                    redemptionId: redemption.id,
                }
            })

            couponValidation = validation
            amountInPaise = validation.finalPaise
        } else {
            amountInPaise = Math.round(effectiveCoursePrice * 100)
        }
    } else if (plan === "YEARLY") {
        amountInPaise = 499900 // ₹4,999
    } else {
        amountInPaise = 49900 // ₹499
    }

    // Client amount tampering check: if client sent an amount, ensure it matches server calculation
    const clientAmount = !isSimplePlan && typeof params.amount === "number" ? params.amount : null
    if (clientAmount !== null) {
        const expectedRupees = Math.round(amountInPaise / 100)
        if (Math.abs(clientAmount - expectedRupees) > 1) {
            throw new Error(`Tampered amount detected. Expected ₹${expectedRupees}, received ₹${clientAmount}.`)
        }
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

        // Persist server-side order record and coupon redemption
        try {
            if (couponValidation?.tempPaymentId) {
                // Update externalId on pre-reserved payment row
                await prisma.payment.update({
                    where: { id: couponValidation.tempPaymentId },
                    data: {
                        externalId: order.id,
                        metadata: {
                            orderId: order.id,
                            courseId: resolvedCourse?.id || courseId || null,
                            plan: plan || (courseId ? "COURSE" : "MONTHLY"),
                            amountPaise: order.amount,
                            couponCode: couponValidation.coupon.code,
                            couponId: couponValidation.coupon.id,
                        },
                    },
                })
            } else {
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
                        },
                    },
                })
            }
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

