import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getGoalForCourse } from "@/lib/utils/course-goal-mapper"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"
import { resolveCourseAlias } from "@/lib/courses/slug-aliases"


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

        const resolvedTarget = resolveCourseAlias(courseId)
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
        // B-007: persist to the DB; there is no in-memory fallback any more.
        let goalPersisted = true
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { selectedGoal: goalId },
            })
        } catch (goalErr) {
            console.error("[courses/enroll] failed to persist the goal:", goalErr)
            goalPersisted = false
        }

        revalidatePath("/my-learning")
        revalidatePath("/dashboard")

        const res = NextResponse.json({
            success: true,
            message: "Enrolled successfully",
            courseId: course.id,
            courseTitle: course.title,
            courseSlug: course.slug,
            goalId,
            goalPersisted,
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
