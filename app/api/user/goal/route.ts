import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getGoalForCourse } from "@/lib/utils/course-goal-mapper"

import { userGoalsMemoryMap } from "@/lib/user-goals-memory"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ success: true, goal: null })
        }

        // 1. Check DB first (authoritative source of truth)
        let dbGoal: { goalId: string; subGoalId?: string; updatedAt: string } | null = null
        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { selectedGoal: true, selectedSubGoal: true, updatedAt: true },
            })
            if (dbUser?.selectedGoal) {
                dbGoal = {
                    goalId: dbUser.selectedGoal,
                    subGoalId: dbUser.selectedSubGoal || undefined,
                    updatedAt: dbUser.updatedAt.toISOString(),
                }
                userGoalsMemoryMap.set(session.user.id, dbGoal)
            }
        } catch (dbErr) {
            console.warn("Could not fetch user goal from DB:", dbErr)
        }

        let saved = dbGoal || userGoalsMemoryMap.get(session.user.id)

        // Return current saved goal or null (NEVER fallback to skills automatically)
        return NextResponse.json(
            {
                success: true,
                goal: saved || null,
            },
            {
                headers: {
                    "Cache-Control": "private, no-cache, no-store, must-revalidate",
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

            // Persist to DB as authoritative source of truth
            try {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: {
                        selectedGoal: goalId,
                        selectedSubGoal: subGoalId || null,
                    },
                })
            } catch (dbErr) {
                console.warn("Failed to persist user goal to DB:", dbErr)
            }
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
