import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { verifyRazorpaySignature, razorpay } from "@/lib/payments/razorpay"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getGoalForCourse } from "@/lib/utils/course-goal-mapper"
import { userGoalsMemoryMap } from "@/lib/user-goals-memory"
import { fulfilPaymentOrder } from "@/lib/payments/fulfilment"

const COURSE_ALIASES: Record<string, string> = {
    "half-yearly-678": "half-yearly-6",
    "half-yearly-78": "half-yearly-6",
    "half-yearly-8": "half-yearly-6",
    "upsc-prelims-mains-batch": "upsc-prelims-mains-comprehensive-batch",
    "upsc-gs-primer": "upsc-gs-foundation-primer",
    "bpsc-prelims-current-affairs": "72nd-bpsc-prelims-current-affairs",
    "bpsc-video-2": "bpsc-2nd-video-tutorial",
    "class-6-mastery": "class-6-complete-mastery-batch",
    "class-6-starter": "class-6-foundation-starter",
    "class-7-excellence": "class-7-academic-excellence-batch",
    "class-7-booster": "class-7-concept-booster",
    "class-8-olympiad": "class-8-olympiad-board-foundation-batch",
    "class-8-essentials": "class-8-pre-foundation-essentials",
    "class-9-target-95": "class-9-target-95-foundation-batch",
    "class-9-bridge": "class-9-cbse-bridge-course",
    "class-10-toppers": "class-10-board-toppers-comprehensive-batch",
    "class-10-revision": "class-10-board-revision-sprint",
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        const body = await request.json()
        const { orderId, paymentId, signature, plan, courseId, userId: explicitUserId } = body

        const currentUserId = session?.user?.id || explicitUserId
        const currentUserEmail = session?.user?.email

        if (!currentUserId && !currentUserEmail) {
            return NextResponse.json(
                { error: "Unauthorized: User must be signed in" },
                { status: 401 }
            )
        }

        // Verify signature
        const isValid = verifyRazorpaySignature({
            orderId,
            paymentId,
            signature,
        })

        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 400 }
            )
        }

        // Validate against DB order record created server-side for razorpay_order_id
        if (!orderId) {
            return NextResponse.json(
                { error: "Missing orderId" },
                { status: 400 }
            )
        }

        const dbOrderRecord = await prisma.payment.findFirst({
            where: {
                OR: [
                    { externalId: orderId },
                    { metadata: { path: ["orderId"], equals: orderId } },
                ],
            },
        })

        if (!dbOrderRecord) {
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 }
            )
        }

        if (currentUserId && dbOrderRecord.userId !== currentUserId) {
            return NextResponse.json(
                { error: "Order ownership mismatch" },
                { status: 403 }
            )
        }

        const dbCourseId = (dbOrderRecord.metadata as any)?.courseId
        if (dbCourseId && courseId) {
            const resolvedTarget = COURSE_ALIASES[courseId] || courseId
            const resolvedOrderTarget = COURSE_ALIASES[dbCourseId] || dbCourseId
            if (resolvedTarget !== resolvedOrderTarget && courseId !== dbCourseId) {
                return NextResponse.json(
                    { error: "Order course mismatch" },
                    { status: 400 }
                )
            }
        }

        // Validate Razorpay order ownership and courseId match if order exists in Razorpay
        if (razorpay && !orderId.startsWith("order_mock_") && !orderId.startsWith("order_test_")) {
            try {
                const rzpOrder = await razorpay.orders.fetch(orderId)
                if (rzpOrder && rzpOrder.notes) {
                    const orderUserId = rzpOrder.notes.userId
                    const orderCourseId = rzpOrder.notes.courseId

                    if (orderUserId && currentUserId && orderUserId !== currentUserId) {
                        return NextResponse.json(
                            { error: "Order ownership mismatch" },
                            { status: 403 }
                        )
                    }

                    if (orderCourseId && courseId) {
                        const resolvedTarget = COURSE_ALIASES[courseId] || courseId
                        const resolvedOrderTarget = COURSE_ALIASES[orderCourseId] || orderCourseId
                        if (resolvedTarget !== resolvedOrderTarget && courseId !== orderCourseId) {
                            return NextResponse.json(
                                { error: "Order course mismatch" },
                                { status: 400 }
                            )
                        }
                    }
                }
            } catch (err: any) {
                console.warn("Could not fetch order from Razorpay API for metadata assertion:", err.message)
            }
        }

        // Fulfill payment and enrollment atomically and idempotently
        const targetCourseId = courseId || dbCourseId
        const fulfillRes = await fulfilPaymentOrder({
            orderId,
            paymentId,
            courseId: targetCourseId,
            plan: plan || (dbOrderRecord.metadata as any)?.plan,
            currentUserId,
        })

        if (!fulfillRes.success) {
            return NextResponse.json(
                { error: fulfillRes.error || "Fulfillment failed" },
                { status: fulfillRes.status }
            )
        }

        // Determine goal if course enrollment
        let goalId: string | null = null
        if (targetCourseId) {
            const course = await prisma.course.findFirst({
                where: { OR: [{ id: targetCourseId }, { slug: targetCourseId }] },
                select: { id: true, title: true, slug: true, price: true },
            })
            if (course) {
                goalId = getGoalForCourse(course)
                userGoalsMemoryMap.set(currentUserId, {
                    goalId,
                    updatedAt: new Date().toISOString(),
                })
            }
        }

        revalidatePath("/my-learning")
        revalidatePath("/my-tests")
        revalidatePath("/dashboard")

        const res = NextResponse.json({
            success: true,
            type: targetCourseId ? "course" : "subscription",
            redirectUrl: targetCourseId ? "/my-learning" : "/my-tests",
            goalId,
        })

        if (goalId) {
            res.cookies.set("trillion_selected_goal", goalId, {
                path: "/",
                maxAge: 31536000,
                sameSite: "lax",
            })
        }

        return res
    } catch (error) {
        console.error("Payment verification error:", error)
        return NextResponse.json(
            { error: "Failed to verify payment" },
            { status: 500 }
        )
    }
}
