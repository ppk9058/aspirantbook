import { prisma } from "@/lib/prisma"
import { userGoalsMemoryMap } from "@/lib/user-goals-memory"
import goalsConfig from "@/data/goals-config.json"

export interface UserGoalSelection {
    goalId: string
    subGoalId?: string
    goalIds: string[]
    updatedAt: string
}

/**
 * Normalizes any stored goal string (which may be a comma-separated list like "upsc,ssc"
 * or a single goal ID "upsc") into a clean array of lowercase IDs.
 */
export function parseGoalIds(rawGoal: string | null | undefined): string[] {
    if (!rawGoal || !rawGoal.trim()) return []
    return rawGoal
        .split(",")
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean)
}

/**
 * Serializes an array of goal IDs into a canonical comma-separated string for storage.
 */
export function serializeGoalIds(goalIds: string[]): string {
    const unique = Array.from(new Set(goalIds.map((g) => g.trim().toLowerCase()).filter(Boolean)))
    return unique.join(",")
}

/**
 * Returns student goals from DB (primary source of truth), falling back to in-memory map or cookie.
 */
export async function getStudentGoals(
    userId?: string | null,
    cookieGoal?: string | null
): Promise<{ primaryGoal: string | null; goalIds: string[] }> {
    let rawGoal: string | null = null

    if (userId) {
        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { selectedGoal: true },
            })
            if (dbUser?.selectedGoal) {
                rawGoal = dbUser.selectedGoal
            }
        } catch (dbErr) {
            console.warn("Could not fetch user goal from DB:", dbErr)
        }

        if (!rawGoal) {
            const mem = userGoalsMemoryMap.get(userId)
            if (mem?.goalId) {
                rawGoal = mem.goalId
            }
        }
    }

    if (!rawGoal && cookieGoal) {
        rawGoal = cookieGoal
    }

    const goalIds = parseGoalIds(rawGoal)
    const primaryGoal = goalIds.length > 0 ? goalIds[0] : null

    return { primaryGoal, goalIds }
}

/**
 * Persists student goals to DB and in-memory map.
 */
export async function saveStudentGoals(
    userId: string,
    goalIds: string[],
    subGoalId?: string | null
): Promise<{ serialized: string; goalIds: string[] }> {
    const serialized = serializeGoalIds(goalIds)

    userGoalsMemoryMap.set(userId, {
        goalId: serialized,
        subGoalId: subGoalId || undefined,
        updatedAt: new Date().toISOString(),
    })

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                selectedGoal: serialized,
                selectedSubGoal: subGoalId || null,
            },
        })
    } catch (dbErr) {
        console.warn("Failed to persist user goal to DB:", dbErr)
    }

    return { serialized, goalIds: parseGoalIds(serialized) }
}
