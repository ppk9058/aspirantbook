import { parseGoalIds, serializeGoalIds } from "./student-goals"

export interface QueryGoalSelection {
    raw: string
    ids: string[]
    serialized: string
}

/**
 * Reads a `?goal=` search string (with or without the leading "?") and returns
 * the validated goal selection. Returns null when there is no goal param or when
 * every supplied id is unknown.
 */
export function getQueryGoal(search: string | null | undefined): QueryGoalSelection | null {
    if (!search) return null

    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
    const raw = params.get("goal")
    if (!raw) return null

    const ids = parseGoalIds(raw, true)
    if (ids.length === 0) return null

    return { raw, ids, serialized: serializeGoalIds(ids) }
}

/**
 * Removes only the `goal` search param and returns the remaining query string,
 * including the leading "?" when other params survive. The hash is not handled
 * here on purpose: callers preserve window.location.hash separately.
 */
export function stripGoalParam(search: string | null | undefined): string {
    if (!search) return ""

    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
    params.delete("goal")
    const remaining = params.toString()
    return remaining ? `?${remaining}` : ""
}
