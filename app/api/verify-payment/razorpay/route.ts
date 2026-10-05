import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { verifyRazorpaySignature } from "@/lib/payments/razorpay"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getGoalForCourse } from "@/lib/utils/course-goal-mapper"
import { userGoalsMemoryMap } from "@/lib/user-goals-memory"

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

        // Get user
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(currentUserId ? [{ id: currentUserId }] : []),
                    ...(currentUserEmail ? [{ email: currentUserEmail }] : []),
                ],
            },
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        // ─── Case 1: Course Enrollment Purchase ──────────────────────────────────
        if (courseId) {
            const resolvedTarget = COURSE_ALIASES[courseId] || courseId
            const course = await prisma.course.findFirst({
                where: {
                    OR: [
                        { id: resolvedTarget },
                        { slug: resolvedTarget },
                        { id: courseId },
                        { slug: courseId },
                    ],
                },
                select: { id: true, title: true, slug: true, price: true },
            })

            if (course) {
                // Create or verify enrollment
                const existing = await prisma.enrollment.findUnique({
                    where: { userId_courseId: { userId: user.id, courseId: course.id } },
                })
                if (!existing) {
                    await prisma.enrollment.create({
                        data: { userId: user.id, courseId: course.id },
                    })
                }

                // Record payment idempotently
                const existingPayment = await prisma.payment.findFirst({
                    where: { externalId: paymentId },
                })
                if (!existingPayment) {
                    await prisma.payment.create({
                        data: {
                            userId: user.id,
                            amount: course.price ?? 0,
                            currency: "INR",
                            status: "COMPLETED",
                            paymentProvider: "razorpay",
                            externalId: paymentId,
                            metadata: {
                                orderId,
                                courseId: course.id,
                                courseTitle: course.title,
                                courseSlug: course.slug,
                            },
                        },
                    })
                }

                // Determine and set platform goal for the enrolled category
                const goalId = getGoalForCourse(course)
                userGoalsMemoryMap.set(user.id, {
                    goalId,
                    updatedAt: new Date().toISOString(),
                })

                revalidatePath("/my-learning")
                revalidatePath("/dashboard")

                const res = NextResponse.json({
                    success: true,
                    type: "course",
                    courseTitle: course.title,
                    goalId,
                    redirectUrl: "/my-learning",
                })

                res.cookies.set("trillion_selected_goal", goalId, {
                    path: "/",
                    maxAge: 31536000,
                    sameSite: "lax",
                })

                return res
            }
        }

        // ─── Case 2: Platform Subscription (Monthly / Yearly) ───────────────────
        const effectivePlan = plan === "YEARLY" ? "YEARLY" : "MONTHLY"
        const startDate = new Date()
        const endDate = new Date()
        if (effectivePlan === "MONTHLY") {
            endDate.setMonth(endDate.getMonth() + 1)
        } else {
            endDate.setFullYear(endDate.getFullYear() + 1)
        }

        // Check for existing subscription
        let subscription = await prisma.subscription.findFirst({
            where: { providerId: paymentId },
        })

        if (!subscription) {
            subscription = await prisma.subscription.create({
                data: {
                    userId: user.id,
                    plan: effectivePlan,
                    status: "ACTIVE",
                    provider: "RAZORPAY",
                    providerId: paymentId,
                    startDate,
                    endDate,
                },
            })
        }

        const existingSubPayment = await prisma.payment.findFirst({
            where: { externalId: paymentId },
        })

        if (!existingSubPayment) {
            await prisma.payment.create({
                data: {
                    userId: user.id,
                    amount: effectivePlan === "MONTHLY" ? 499 : 4999,
                    currency: "INR",
                    status: "COMPLETED",
                    paymentProvider: "razorpay",
                    externalId: paymentId,
                    metadata: {
                        orderId,
                        plan: effectivePlan,
                    },
                },
            })
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { role: "PREMIUM" },
        })

        revalidatePath("/my-tests")
        revalidatePath("/my-learning")
        revalidatePath("/dashboard")

        return NextResponse.json({ success: true, type: "subscription", redirectUrl: "/my-tests" })
    } catch (error) {
        console.error("Payment verification error:", error)
        return NextResponse.json(
            { error: "Failed to verify payment" },
            { status: 500 }
        )
    }
}
