import { prisma } from "@/lib/prisma"
import { PROTECTED_ROLES } from "@/lib/payments/role-safety"
import { resolveEffectivePlan } from "@/lib/payments/pass-plan"

export interface FulfilPaymentParams {
    orderId: string
    paymentId: string
    courseId?: string | null
    plan?: "MONTHLY" | "YEARLY" | "COURSE" | null
    amountPaise?: number | null
    currency?: string | null
    paymentMethod?: string | null
    currentUserId?: string | null
}

export interface FulfilPaymentResult {
    success: boolean
    alreadyFulfilled?: boolean
    error?: string
    status: number
    orderRecord?: any
    enrollment?: any
}

/**
 * Shared, idempotent fulfilment function used by BOTH client verify (/api/verify-payment/razorpay)
 * and webhook (/api/webhooks/razorpay).
 *
 * Guarantees:
 * 1. Exactly 1 Payment row is marked COMPLETED per Razorpay order.
 * 2. Exactly 1 Enrollment row is created per user per course (ON CONFLICT DO NOTHING / upsert).
 * 3. Atomic execution inside a database transaction with row-locking (`FOR UPDATE`) on the Payment.
 * 4. Replay-safe and parallel-safe: duplicate attempts return success without duplicating payments or enrollments.
 */
export async function fulfilPaymentOrder(params: FulfilPaymentParams): Promise<FulfilPaymentResult> {
    const {
        orderId,
        paymentId,
        courseId,
        plan,
        amountPaise,
        currency,
        paymentMethod = "razorpay",
        currentUserId,
    } = params

    if (!orderId) {
        return { success: false, error: "Missing order ID", status: 400 }
    }

    return await prisma.$transaction(async (tx) => {
        // 1. Lock and fetch the order Payment row created at createRazorpayOrder
        const orderRows: any[] = await tx.$queryRaw`
            SELECT * FROM "Payment" 
            WHERE "externalId" = ${orderId} 
               OR "razorpayOrderId" = ${orderId}
               OR (metadata->>'orderId') = ${orderId}
            FOR UPDATE
        `

        if (!orderRows || orderRows.length === 0) {
            return {
                success: false,
                error: `Order "${orderId}" not found in system`,
                status: 404,
            }
        }

        const orderRecord = orderRows[0]
        const meta = (typeof orderRecord.metadata === "string" 
            ? JSON.parse(orderRecord.metadata) 
            : orderRecord.metadata) || {}

        // 2. Ownership assertion
        if (currentUserId && orderRecord.userId !== currentUserId) {
            return {
                success: false,
                error: "Order ownership mismatch",
                status: 403,
            }
        }

        // 3. Course mismatch assertion
        const targetCourseId = courseId || meta.courseId
        if (meta.courseId && courseId && meta.courseId !== courseId) {
            return {
                success: false,
                error: "Order course mismatch",
                status: 400,
            }
        }

        // 4. Amount assertion if provided
        const expectedPaise = meta.amountPaise ?? Math.round(Number(orderRecord.amount) * 100)
        if (amountPaise && Math.abs(amountPaise - expectedPaise) > 100) {
            return {
                success: false,
                error: `Amount mismatch: expected ${expectedPaise}, got ${amountPaise}`,
                status: 400,
            }
        }

        // 5. Currency assertion
        if (currency && orderRecord.currency && currency.toUpperCase() !== orderRecord.currency.toUpperCase()) {
            return {
                success: false,
                error: "Currency mismatch",
                status: 400,
            }
        }

        // 6. Handle idempotent replay if already COMPLETED
        if (orderRecord.status === "COMPLETED") {
            return {
                success: true,
                alreadyFulfilled: true,
                status: 200,
                orderRecord,
            }
        }

        // 7. Fulfil Course Enrollment
        if (targetCourseId) {
            const course = await tx.course.findFirst({
                where: {
                    OR: [{ id: targetCourseId }, { slug: targetCourseId }],
                },
                select: { id: true, title: true, slug: true, price: true },
            })

            if (!course) {
                return { success: false, error: "Course not found", status: 404 }
            }

            // Create or ignore enrollment idempotently
            await tx.enrollment.upsert({
                where: { userId_courseId: { userId: orderRecord.userId, courseId: course.id } },
                update: {},
                create: { userId: orderRecord.userId, courseId: course.id },
            })

            // Update the single existing Payment row to COMPLETED
            const updatedMeta = {
                ...meta,
                orderId,
                paymentId,
                courseId: course.id,
                courseTitle: course.title,
                courseSlug: course.slug,
                capturedAt: new Date().toISOString(),
            }

            await tx.payment.update({
                where: { id: orderRecord.id },
                data: {
                    status: "COMPLETED",
                    externalId: paymentId,
                    razorpayOrderId: orderId,
                    razorpayPaymentId: paymentId,
                    paymentMethod,
                    // B7: record the captured amount in minor units too
                    amountMinor: Math.round(amountPaise ?? expectedPaise),
                    metadata: updatedMeta,
                },
            })

            // Redeem coupon if reserved for this payment
            await tx.couponRedemption.updateMany({
                where: {
                    paymentId: orderRecord.id,
                    status: "RESERVED",
                },
                data: {
                    status: "REDEEMED",
                },
            })

            return {
                success: true,
                status: 200,
                orderRecord: { ...orderRecord, status: "COMPLETED", externalId: paymentId },
            }
        }

        // 8. Fulfil Subscription Plan
        const isCourseOrder = Boolean(targetCourseId || meta.courseId)
        const isPassOrder = !isCourseOrder && (orderRecord.amount === 499 || meta.amountPaise === 49900 || !meta.courseId)
        const effectivePlan = resolveEffectivePlan(
            {
                plan: meta.plan,
                courseId: targetCourseId,
                isPassOrder,
            },
            plan
        )
        if (effectivePlan === "MONTHLY" || effectivePlan === "YEARLY") {
            let subscription = await tx.subscription.findFirst({
                where: { providerId: orderId, userId: orderRecord.userId },
            })

            if (!subscription) {
                subscription = await tx.subscription.create({
                    data: {
                        userId: orderRecord.userId,
                        plan: effectivePlan,
                        status: "ACTIVE",
                        provider: "RAZORPAY",
                        providerId: orderId,
                        startDate: new Date(),
                        endDate: new Date(Date.now() + (effectivePlan === "MONTHLY" ? 30 : 365) * 24 * 60 * 60 * 1000),
                    },
                })
            }

            const updatedMeta = {
                ...meta,
                orderId,
                paymentId,
                plan: effectivePlan,
                capturedAt: new Date().toISOString(),
            }

            await tx.payment.update({
                where: { id: orderRecord.id },
                data: {
                    status: "COMPLETED",
                    externalId: paymentId,
                    razorpayOrderId: orderId,
                    razorpayPaymentId: paymentId,
                    subscriptionId: subscription.id,
                    paymentMethod,
                    // B7: record the captured amount in minor units too
                    amountMinor: Math.round(amountPaise ?? expectedPaise),
                    metadata: updatedMeta,
                },
            })

            await tx.user.updateMany({
                where: {
                    id: orderRecord.userId,
                    role: { notIn: [...PROTECTED_ROLES] },
                },
                data: { role: "PREMIUM" },
            })

            return {
                success: true,
                status: 200,
                orderRecord: { ...orderRecord, status: "COMPLETED", externalId: paymentId },
            }
        }

        return {
            success: false,
            error: "Unable to determine fulfillment target (neither course nor subscription)",
            status: 400,
        }
    })
}
