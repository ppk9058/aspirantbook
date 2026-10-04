import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getGoalForCourse } from "@/lib/utils/course-goal-mapper"

// In-memory fallback map for active user goals across the session
export const userGoalsMemoryMap = new Map<string, { goalId: string; subGoalId?: string; updatedAt: string }>()

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ success: true, goal: null })
        }

        let saved = userGoalsMemoryMap.get(session.user.id)

        // If no explicit goal selected yet, check the student's latest enrolled course!
        if (!saved) {
            try {
                const latestEnrollment = await prisma.enrollment.findFirst({
                    where: { userId: session.user.id },
                    orderBy: { enrolledAt: "desc" },
                    select: {
                        id: true,
                        course: { select: { slug: true, title: true } },
                    },
                })

                if (latestEnrollment?.course) {
                    const derivedGoalId = getGoalForCourse(latestEnrollment.course)
                    saved = {
                        goalId: derivedGoalId,
                        updatedAt: new Date().toISOString(),
                    }
                    userGoalsMemoryMap.set(session.user.id, saved)
                }
            } catch (dbErr) {
                console.warn("Could not derive user goal from enrollment:", dbErr)
            }
        }

        return NextResponse.json(
            {
                success: true,
                goal: saved || null,
            },
            {
                headers: {
                    "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
                },
            }
        )
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to fetch user goal" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        const body = await req.json()
        const { goalId, subGoalId } = body

        if (!goalId) {
            return NextResponse.json({ success: false, error: "goalId is required" }, { status: 400 })
        }

        if (session?.user?.id) {
            userGoalsMemoryMap.set(session.user.id, {
                goalId,
                subGoalId,
                updatedAt: new Date().toISOString(),
            })
        }

        const res = NextResponse.json({
            success: true,
            goal: { goalId, subGoalId },
        })

        // Also persist as cookie so server components and client hydrate consistently
        res.cookies.set("trillion_selected_goal", goalId, {
            path: "/",
            maxAge: 31536000,
            sameSite: "lax",
        })

        return res
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to save user goal" }, { status: 500 })
    }
}
