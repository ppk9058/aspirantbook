import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createGoalGetHandler, readUserGoal, writeUserGoal } from "@/lib/goals/user-goal-store"
import { parseGoalIds } from "@/lib/goals/student-goals"

// B-007: goals come from the database only. The old in-memory fallback map is
// gone; if the DB read or write fails the request fails closed (503) instead of
// returning a per-instance cached value.

export const GET = createGoalGetHandler({
    getUserId: async () => (await auth())?.user?.id ?? null,
    getGoal: (userId) => readUserGoal(userId),
})

export async function POST(req: Request) {
    let session
    try {
        session = await auth()
    } catch (error) {
        console.error("[user-goal] could not resolve the session:", error)
        return NextResponse.json({ success: false, error: "Unauthorized: Login required" }, { status: 401 })
    }

    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: "Unauthorized: Login required" }, { status: 401 })
    }

    let body: any
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
    }

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

    let stored
    try {
        stored = await writeUserGoal(session.user.id, targetGoalIds, subGoalId)
    } catch (error) {
        console.error("[user-goal] database write failed:", error)
        return NextResponse.json(
            { success: false, error: "Goal storage unavailable" },
            { status: 503 }
        )
    }

    const res = NextResponse.json({
        success: true,
        goal: { goalId: stored.goalId, goalIds: stored.goalIds, subGoalId: stored.subGoalId },
    })

    // Also persist as cookie so server components and client hydrate consistently
    res.cookies.set("trillion_selected_goal", stored.goalId, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
    })

    return res
}
