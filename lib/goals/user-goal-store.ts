import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseGoalIds, serializeGoalIds } from "./student-goals"

/**
 * B-007: the database is the only source of truth for a user's goal.
 *
 * There used to be a module-level `Map` (`lib/user-goals-memory.ts`) that acted
 * as a "fallback" when the DB read failed. On serverless that map is
 * per-instance, so two requests could see different goals and a stale goal
 * survived a failed write. It is deleted; a failed read now returns 503.
 */

export interface StoredGoal {
  goalId: string
  goalIds: string[]
  subGoalId?: string
  updatedAt: string
}

/** Narrow client shape so tests can inject a failing implementation. */
export interface GoalStoreClient {
  user: {
    findUnique(args: any): Promise<any>
    update(args: any): Promise<any>
  }
}

const defaultClient = prisma as unknown as GoalStoreClient

/** Throws if the database is unreachable - callers decide how to fail. */
export async function readUserGoal(
  userId: string,
  client: GoalStoreClient = defaultClient
): Promise<StoredGoal | null> {
  const row = await client.user.findUnique({
    where: { id: userId },
    select: { selectedGoal: true, selectedSubGoal: true, updatedAt: true },
  })
  if (!row?.selectedGoal) return null
  return {
    goalId: row.selectedGoal,
    goalIds: parseGoalIds(row.selectedGoal),
    subGoalId: row.selectedSubGoal || undefined,
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Throws if the write fails. There is no in-memory fallback any more. */
export async function writeUserGoal(
  userId: string,
  goalIds: string[],
  subGoalId?: string | null,
  client: GoalStoreClient = defaultClient
): Promise<StoredGoal> {
  const serialized = serializeGoalIds(goalIds)
  const row = await client.user.update({
    where: { id: userId },
    data: { selectedGoal: serialized, selectedSubGoal: subGoalId || null },
  })
  return {
    goalId: serialized,
    goalIds: parseGoalIds(serialized),
    subGoalId: subGoalId || undefined,
    updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
  }
}

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
}

export interface GoalGetDeps {
  getUserId: () => Promise<string | null>
  getGoal: (userId: string) => Promise<StoredGoal | null>
}

/**
 * GET /api/user/goal handler factory. Kept separate from the route file so the
 * 503-on-DB-failure contract can be unit tested without a Next request scope.
 */
export function createGoalGetHandler(deps: GoalGetDeps) {
  return async function GET() {
    let userId: string | null
    try {
      userId = await deps.getUserId()
    } catch (error) {
      console.error("[user-goal] could not resolve the session:", error)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ success: true, goal: null, goalIds: [] }, { headers: NO_STORE_HEADERS })
    }

    try {
      const goal = await deps.getGoal(userId)
      return NextResponse.json({ success: true, goal }, { headers: NO_STORE_HEADERS })
    } catch (error) {
      console.error("[user-goal] database read failed:", error)
      return NextResponse.json(
        { success: false, error: "Goal storage unavailable" },
        { status: 503, headers: NO_STORE_HEADERS }
      )
    }
  }
}
