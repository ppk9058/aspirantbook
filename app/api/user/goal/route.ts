import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { userGoalsMemoryMap } from "@/lib/user-goals-memory"
import { parseGoalIds, serializeGoalIds } from "@/lib/goals/student-goals"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ success: true, goal: null, goalIds: [] })
        }

        // 1. Check DB first (authoritative source of truth)
        let rawGoal: string | null = null
        let subGoalId: string | undefined = undefined
        let updatedAt: string = new Date().toISOString()

        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { selectedGoal: true, selectedSubGoal: true, updatedAt: true },
            })
            if (dbUser?.selectedGoal) {
                rawGoal = dbUser.selectedGoal
                subGoalId = dbUser.selectedSubGoal || undefined
                updatedAt = dbUser.updatedAt.toISOString()
                userGoalsMemoryMap.set(session.user.id, {
                    goalId: rawGoal,
                    subGoalId,
                    updatedAt,
                })
            }
        } catch (dbErr) {
            console.warn("Could not fetch user goal from DB:", dbErr)
        }

        if (!rawGoal) {
            const mem = userGoalsMemoryMap.get(session.user.id)
            if (mem?.goalId) {
                rawGoal = mem.goalId
                subGoalId = mem.subGoalId
                updatedAt = mem.updatedAt
            }
        }

        const goalIds = parseGoalIds(rawGoal)

        return NextResponse.json(
            {
                success: true,
                goal: rawGoal
                    ? {
                          goalId: rawGoal,
                          goalIds,
                          subGoalId,
                          updatedAt,
                      }
                    : null,
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
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized: Login required" }, { status: 401 })
        }

        const body = await req.json()
        const { goalId, goalIds: inputGoalIds, subGoalId } = body

        let targetGoalIds: string[] = []
        if (Array.isArray(inputGoalIds) && inputGoalIds.length > 0) {
            targetGoalIds = inputGoalIds.map((g) => String(g).trim().toLowerCase()).filter(Boolean)
        } else if (goalId) {
            targetGoalIds = parseGoalIds(String(goalId))
        }

        if (targetGoalIds.length === 0) {
            return NextResponse.json({ success: false, error: "At least one goal is required" }, { status: 400 })
        }

        const serialized = serializeGoalIds(targetGoalIds)

        if (session?.user?.id) {
            userGoalsMemoryMap.set(session.user.id, {
                goalId: serialized,
                subGoalId,
                updatedAt: new Date().toISOString(),
            })

            // Persist to DB as authoritative source of truth
            try {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: {
                        selectedGoal: serialized,
                        selectedSubGoal: subGoalId || null,
                    },
                })
            } catch (dbErr) {
                console.warn("Failed to persist user goal to DB:", dbErr)
            }
        }

        const res = NextResponse.json({
            success: true,
            goal: { goalId: serialized, goalIds: targetGoalIds, subGoalId },
        })

        // Also persist as cookie so server components and client hydrate consistently
        res.cookies.set("trillion_selected_goal", serialized, {
            path: "/",
            maxAge: 31536000,
            sameSite: "lax",
        })

        return res
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to save user goal" }, { status: 500 })
    }
}
