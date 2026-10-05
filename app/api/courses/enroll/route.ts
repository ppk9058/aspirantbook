import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getGoalForCourse } from "@/lib/utils/course-goal-mapper"
import { userGoalsMemoryMap } from "@/lib/user-goals-memory"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"

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
        const session = await auth()
        const body = await req.json().catch(() => ({}))
        const { courseId, phoneNumber } = body

        if (!courseId) {
            return NextResponse.json({ error: "courseId is required" }, { status: 400 })
        }

        let userId = session?.user?.id

        // If no active session, but phone number provided, find or create the user
        if (!userId && phoneNumber) {
            if (!/^[0-9]{10}$/.test(phoneNumber)) {
                return NextResponse.json(
                    { error: "Please enter a valid 10-digit mobile number." },
                    { status: 400 }
                )
            }

            const syntheticEmail = `mobile_${phoneNumber}@aspirantbook.local`
            let user = await prisma.user.findUnique({
                where: { phoneNumber },
                select: { id: true },
            })

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        phoneNumber,
                        email: syntheticEmail,
                        name: "student",
                        role: "FREE",
                    },
                    select: { id: true },
                })
            }
            userId = user.id
        }

        if (!userId) {
            return NextResponse.json(
                { error: "Please sign in or provide a mobile number to enroll." },
                { status: 401 }
            )
        }

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
            select: { id: true, title: true, slug: true, price: true, isPremium: true, status: true, isPublished: true },
        })

        const callerRole = (session?.user as any)?.role

        if (!course || !isCourseVisibleToUser(course, callerRole)) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 })
        }

        // Gate paid courses - free enroll route must only enroll free courses
        if (course.isPremium || (course.price && course.price > 0)) {
            return NextResponse.json(
                { error: "This is a paid course. Please complete checkout to enroll.", requiresPayment: true },
                { status: 403 }
            )
        }

        // Check if already enrolled
        const existing = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: course.id,
                },
            },
        })

        if (!existing) {
            await prisma.enrollment.create({
                data: {
                    userId,
                    courseId: course.id,
                },
            })
        }

        // Determine goal category for this course (e.g. class-10, class-6, upsc, etc.)
        const goalId = getGoalForCourse(course)
        userGoalsMemoryMap.set(userId, {
            goalId,
            updatedAt: new Date().toISOString(),
        })

        revalidatePath("/my-learning")
        revalidatePath("/dashboard")

        const res = NextResponse.json({
            success: true,
            message: "Enrolled successfully",
            courseId: course.id,
            courseTitle: course.title,
            courseSlug: course.slug,
            goalId,
            redirectUrl: "/my-learning",
        })

        res.cookies.set("trillion_selected_goal", goalId, {
            path: "/",
            maxAge: 31536000,
            sameSite: "lax",
        })

        return res
    } catch (error) {
        console.error("Course enrollment error:", error)
        return NextResponse.json(
            { error: "Internal server error during enrollment" },
            { status: 500 }
        )
    }
}
