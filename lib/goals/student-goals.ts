import { prisma } from "@/lib/prisma"
import goalsConfig from "@/data/goals-config.json"

export interface UserGoalSelection {
    goalId: string
    subGoalId?: string
    goalIds: string[]
    updatedAt: string
}

const KNOWN_GOAL_IDS = new Set<string>()
for (const g of (goalsConfig as any).popularGoals || []) {
    if (g.id) KNOWN_GOAL_IDS.add(g.id.toLowerCase())
}
for (const cat of (goalsConfig as any).categories || []) {
    for (const g of cat.goals || []) {
        if (g.id) KNOWN_GOAL_IDS.add(g.id.toLowerCase())
    }
}

export function isValidGoalId(id: string): boolean {
    return KNOWN_GOAL_IDS.has(id.trim().toLowerCase())
}

/**
 * Normalizes any stored goal string (which may be a comma-separated list like "upsc,ssc"
 * or a single goal ID "upsc") into a clean array of lowercase IDs.
 */
export function parseGoalIds(rawGoal: string | null | undefined, validateAgainstKnown = false): string[] {
    if (!rawGoal || !rawGoal.trim()) return []
    let cleaned = rawGoal
    try {
        cleaned = decodeURIComponent(rawGoal)
    } catch {}
    const parsed = cleaned
        .split(",")
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean)
    if (validateAgainstKnown) {
        return parsed.filter((g) => KNOWN_GOAL_IDS.has(g))
    }
    return parsed
}

/**
 * Serializes an array of goal IDs into a canonical comma-separated string for storage.
 */
export function serializeGoalIds(goalIds: string[]): string {
    const unique = Array.from(new Set(goalIds.map((g) => g.trim().toLowerCase()).filter(Boolean)))
    return unique.join(",")
}

/**
 * Returns student goals from the DB (the only server-side source of truth),
 * falling back to the client's goal cookie when there is no DB row.
 * B-007: the in-memory fallback map was removed.
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

    }

    if (!rawGoal && cookieGoal) {
        rawGoal = cookieGoal
    }

    const validated = parseGoalIds(rawGoal, true)
    const goalIds = validated.length > 0 ? validated : parseGoalIds(rawGoal)
    const primaryGoal = goalIds.length > 0 ? goalIds[0] : null

    return { primaryGoal, goalIds }
}

/**
 * Persists student goals to the DB. Throws if the write fails (no memory fallback).
 */
export async function saveStudentGoals(
    userId: string,
    goalIds: string[],
    subGoalId?: string | null
): Promise<{ serialized: string; goalIds: string[] }> {
    const serialized = serializeGoalIds(goalIds)

    await prisma.user.update({
        where: { id: userId },
        data: {
            selectedGoal: serialized,
            selectedSubGoal: subGoalId || null,
        },
    })

    return { serialized, goalIds: parseGoalIds(serialized) }
}
