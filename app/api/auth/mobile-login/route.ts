import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getGoalForCourse } from "@/lib/utils/course-goal-mapper"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

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

        const { phoneNumber, courseId, otp } = await req.json()

        const isProduction = process.env.NODE_ENV === "production"
        let isLocalTestDb = false
        try {
            const dbUrl = process.env.DATABASE_URL || ""
            const parsed = new URL(dbUrl)
            isLocalTestDb = (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.pathname.endsWith("_test")
        } catch {
            isLocalTestDb = false
        }

        const isDevBypassEnabled =
            (!isProduction && process.env.ALLOW_DEV_MOBILE_LOGIN === "true") ||
            (process.env.APP_ENV === "test" && isLocalTestDb)

        // In production (unless APP_ENV=test against local test DB) or when the dev flag is off, test OTP is disabled
        if (!isDevBypassEnabled) {
            return NextResponse.json(
                { error: "SMS OTP service is currently being configured. Mobile dev login is disabled." },
                { status: 503 }
            )
        }

        if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
            return NextResponse.json(
                { error: "Please enter a valid 10-digit mobile number." },
                { status: 400 }
            )
        }

        const syntheticEmail = `mobile_${phoneNumber}@aspirantbook.local`

        // Find or create user by phone number
        let user = await prisma.user.findUnique({
            where: { phoneNumber },
            select: { id: true, name: true, email: true, phoneNumber: true, role: true },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    phoneNumber,
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

        const res = NextResponse.json({
            success: true,
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
