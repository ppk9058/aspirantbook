import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getGoalForCourse } from "@/lib/utils/course-goal-mapper"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { isDevBypassAllowed } from "@/lib/api/v1/dev-bypass"
import { isOtpProviderConfigured } from "@/lib/services/sms-otp/provider"
import { otpService } from "@/lib/services/sms-otp/service"
import { createOtpProof } from "@/lib/services/sms-otp/proof"

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

function failureStatus(code: string): number {
    switch (code) {
        case "invalid_phone":
            return 400
        case "invalid_code":
        case "expired":
        case "already_verified":
        case "not_found":
            return 401
        case "cooldown":
        case "rate_limited":
        case "provider_rate_limited":
        case "too_many_attempts":
            return 429
        case "not_configured":
            return 503
        default:
            return 502
    }
}

export async function POST(req: NextRequest) {
    try {
        const clientIp = getClientIp(req)
        const rateLimitKey = `mobile_login:${clientIp}`
        const rl = await checkRateLimit(rateLimitKey, 10, 60, { failClosed: true })
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many login requests. Please try again later." },
                { status: 429 }
            )
        }

        const body = await req.json().catch(() => ({}))
        const { phoneNumber, code, verificationId, courseId } = body ?? {}

        // OTP is available only with a real provider, or an explicit dev bypass in
        // a non-production build. Production can never take the bypass path.
        const otpEnabled =
            isOtpProviderConfigured() ||
            (process.env.NODE_ENV !== "production" && isDevBypassAllowed())
        if (!otpEnabled) {
            return NextResponse.json(
                { error: "SMS OTP service is currently being configured. Mobile login is disabled." },
                { status: 503 }
            )
        }

        // ── Step 1: request a code. Never touches the User table, so the response
        // cannot reveal whether an account exists for this number.
        if (!code && !verificationId) {
            const sent = await otpService.sendOtp({ rawPhone: phoneNumber, ip: clientIp })
            if (!sent.ok) {
                return NextResponse.json(
                    {
                        error: sent.message,
                        ...(sent.retryAfterSeconds ? { retryAfter: sent.retryAfterSeconds } : {}),
                    },
                    { status: failureStatus(sent.code) }
                )
            }
            return NextResponse.json({
                success: true,
                step: "otp",
                verificationId: sent.verificationId,
                expiresIn: sent.expiresInSeconds,
                resendAfter: sent.resendAfterSeconds,
                devBypass: sent.devBypass,
            })
        }

        // ── Step 2: verify the code, then (and only then) find or create the user.
        const verified = await otpService.verifyOtp({
            rawPhone: phoneNumber,
            code,
            verificationId,
            ip: clientIp,
        })
        if (!verified.ok) {
            return NextResponse.json(
                {
                    error: verified.message,
                    ...(verified.retryAfterSeconds ? { retryAfter: verified.retryAfterSeconds } : {}),
                },
                { status: failureStatus(verified.code) }
            )
        }

        const nationalNumber = verified.phone.nationalNumber
        const syntheticEmail = `mobile_${nationalNumber}@aspirantbook.local`

        // Find or create user by phone number (existing synthetic-email convention).
        let user = await prisma.user.findUnique({
            where: { phoneNumber: nationalNumber },
            select: { id: true, name: true, email: true, phoneNumber: true, role: true },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    phoneNumber: nationalNumber,
                    email: syntheticEmail,
                    name: "student",
                    role: "FREE",
                },
                select: { id: true, name: true, email: true, phoneNumber: true, role: true },
            })
        }

        // Auto-enroll into the course if courseId is provided (supports either DB ID, slug, or alias)
        let enrolledCourse: { id: string; title: string; slug: string } | null = null
        let goalId: string | null = null
        let goalPersisted = true

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
                select: { id: true, slug: true, title: true, price: true, isPremium: true },
            })

            if (course) {
                enrolledCourse = course
                goalId = getGoalForCourse(course)

                // Only auto-enroll if course is explicitly free
                const isFreeCourse = !course.isPremium && (!course.price || course.price === 0)
                if (isFreeCourse) {
                    const existing = await prisma.enrollment.findUnique({
                        where: { userId_courseId: { userId: user.id, courseId: course.id } },
                    })
                    if (!existing) {
                        await prisma.enrollment.create({
                            data: { userId: user.id, courseId: course.id },
                        })
                    }
                }

                if (goalId) {
                    try {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { selectedGoal: goalId },
                        })
                    } catch (goalErr) {
                        // B-007: no memory fallback. Login still succeeds, but the
                        // failure is logged and reported to the client.
                        console.error("[mobile-login] failed to persist the goal:", goalErr)
                        goalPersisted = false
                    }
                }

                revalidatePath("/my-learning")
                revalidatePath("/dashboard")
            }
        }

        // Single-use, phone-bound, ~2 minute proof. NextAuth's mobile provider
        // requires and consumes this; the phone number alone is never enough.
        const proof = createOtpProof(verified.phone.e164)

        const res = NextResponse.json({
            success: true,
            proof,
            email: syntheticEmail,
            userId: user.id,
            name: user.name,
            goalId: goalId || undefined,
            goalPersisted,
            enrolledCourseTitle: enrolledCourse?.title,
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
        console.error("Mobile login error:", error)
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        )
    }
}
