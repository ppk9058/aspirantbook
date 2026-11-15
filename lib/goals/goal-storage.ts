import { parseGoalIds } from "./student-goals"

/**
 * Client-only goal persistence keys.
 *
 * Guest selections live in localStorage + the `trillion_selected_goal` cookie;
 * authenticated users are hydrated from `/api/user/goal`. Both the goal provider
 * and the personalised catalogue surfaces read the same keys from here, so
 * "does this visitor have a saved goal?" has exactly one answer.
 */
export const GOAL_STORAGE_KEY = "trillion_selected_goal"
export const SUBGOAL_STORAGE_KEY = "trillion_selected_sub_goal"

function readClientCookie(name: string): string | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"))
    if (!match) return null
    try {
        return decodeURIComponent(match[2])
    } catch {
        return match[2]
    }
}

/**
 * Returns true when this browser already stores an exam-target selection.
 *
 * Server-rendered catalogues must never depend on it (crawlers have no
 * storage), so it is only read from client effects, after hydration.
 */
export function hasPersistedGoalSelection(): boolean {
    if (typeof window === "undefined") return false

    let stored: string | null = null
    try {
        stored = localStorage.getItem(GOAL_STORAGE_KEY) ?? readClientCookie(GOAL_STORAGE_KEY)
    } catch {
        stored = readClientCookie(GOAL_STORAGE_KEY)
    }

    return parseGoalIds(stored).length > 0
}
