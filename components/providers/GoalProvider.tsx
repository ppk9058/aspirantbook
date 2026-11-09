"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import goalsConfig from "@/data/goals-config.json"
import { parseGoalIds, serializeGoalIds } from "@/lib/goals/student-goals"
import { getQueryGoal, stripGoalParam } from "@/lib/goals/query-goal"

function getClientCookie(name: string): string | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"))
    if (!match) return null
    try {
        return decodeURIComponent(match[2])
    } catch {
        return match[2]
    }
}

function setGuestGoalCookie(serialized: string) {
    if (typeof document === "undefined") return
    const maxAge = 31536000 // 1 year, matching app/api/user/goal/route.ts:124
    document.cookie = `trillion_selected_goal=${encodeURIComponent(serialized)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export interface SubGoal {
    id: string
    name: string
    tag: string
}

export interface Goal {
    id: string
    name: string
    fullName?: string
    icon?: string
    color?: string
    category?: string
    tags: string[]
    hasDrillDown?: boolean
    subGoals?: SubGoal[]
    tagline?: string
}

export interface GoalCategory {
    id: string
    title: string
    description: string
    icon: string
    goals: Goal[]
}

export interface OtherOffering {
    id: string
    title: string
    description: string
    badge: string
    icon: string
}

export interface GoalContextType {
    selectedGoal: Goal
    selectedGoals: Goal[]
    selectedGoalIds: string[]
    selectedSubGoal: SubGoal | null
    isLoaded: boolean
    allGoalsConfig: {
        popularGoals: Goal[]
        categories: GoalCategory[]
        otherOfferings: OtherOffering[]
    }
    isGoalModalOpen: boolean
    openGoalModal: () => void
    closeGoalModal: () => void
    selectGoal: (goal: Goal, subGoal?: SubGoal | null) => void
    toggleGoal: (goal: Goal) => void
    setGoalIds: (goalIds: string[]) => void
}

const DEFAULT_GOAL: Goal = (goalsConfig.popularGoals[0] as Goal) || {
    id: "upsc",
    name: "UPSC",
    fullName: "UPSC Civil Services Examination",
    icon: "Landmark",
    tags: ["upsc", "civil-services"],
}

export function findGoalById(goalId: string): Goal | null {
    const popular = goalsConfig.popularGoals.find(g => g.id.toLowerCase() === goalId.toLowerCase())
    if (popular) return popular as Goal

    for (const cat of goalsConfig.categories) {
        const found = cat.goals.find(g => g.id.toLowerCase() === goalId.toLowerCase())
        if (found) {
            return {
                ...(found as any),
                category: cat.title,
            } as Goal
        }
    }
    return null
}

const GoalContext = createContext<GoalContextType>({
    selectedGoal: DEFAULT_GOAL,
    selectedGoals: [DEFAULT_GOAL],
    selectedGoalIds: [DEFAULT_GOAL.id],
    selectedSubGoal: null,
    isLoaded: false,
    allGoalsConfig: goalsConfig as any,
    isGoalModalOpen: false,
    openGoalModal: () => {},
    closeGoalModal: () => {},
    selectGoal: () => {},
    toggleGoal: () => {},
    setGoalIds: () => {},
})

const STORAGE_GOAL_KEY = "trillion_selected_goal"
const STORAGE_SUBGOAL_KEY = "trillion_selected_sub_goal"
let cachedUserGoalPromise: Promise<any> | null = null

export function invalidateCachedUserGoalPromise() {
    cachedUserGoalPromise = null
}

export function getCachedUserGoalPromise(): Promise<any> | null {
    return cachedUserGoalPromise
}

export function setCachedUserGoalPromise(promise: Promise<any> | null) {
    cachedUserGoalPromise = promise
}

export function GoalProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([DEFAULT_GOAL.id])
    const [selectedSubGoal, setSelectedSubGoal] = useState<SubGoal | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)

    const prevUserIdRef = useRef<string | undefined>(session?.user?.id)
    useEffect(() => {
        if (prevUserIdRef.current !== session?.user?.id) {
            prevUserIdRef.current = session?.user?.id
            invalidateCachedUserGoalPromise()
        }
    }, [session?.user?.id])

    const selectedGoalIdsRef = useRef<string[]>(selectedGoalIds)
    useEffect(() => {
        selectedGoalIdsRef.current = selectedGoalIds
    }, [selectedGoalIds])

    const selectedGoals = useMemo(() => {
        const list: Goal[] = []
        for (const gid of selectedGoalIds) {
            const g = findGoalById(gid)
            if (g) list.push(g)
        }
        return list.length > 0 ? list : [DEFAULT_GOAL]
    }, [selectedGoalIds])

    const selectedGoal = selectedGoals[0] || DEFAULT_GOAL

    const applyGoalsFromRaw = useCallback((raw: string, subGoalId?: string | null) => {
        const parsed = parseGoalIds(raw)
        if (parsed.length > 0) {
            setSelectedGoalIds(parsed)
            const first = findGoalById(parsed[0])
            if (first && subGoalId && (first as any).subGoals) {
                const foundSub = (first as any).subGoals.find((s: any) => s.id === subGoalId)
                if (foundSub) setSelectedSubGoal(foundSub)
            } else {
                setSelectedSubGoal(null)
            }
        }
    }, [])

    const lastRefreshedMismatchRef = useRef<string | null>(null)
    const pendingQueryGoalSyncRef = useRef<{ serialized: string; ids: string[] } | null>(null)

    useEffect(() => {
        if (session?.user?.id && pendingQueryGoalSyncRef.current) {
            const { serialized, ids } = pendingQueryGoalSyncRef.current
            pendingQueryGoalSyncRef.current = null
            fetch("/api/user/goal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goalId: serialized,
                    goalIds: ids,
                    subGoalId: null,
                }),
            }).catch(() => {})
        }
    }, [session?.user?.id])

    // Load persisted selection from localStorage or user API
    useEffect(() => {
        try {
            const savedGoalId = localStorage.getItem(STORAGE_GOAL_KEY)
            const savedSubGoalId = localStorage.getItem(STORAGE_SUBGOAL_KEY)
            const cookieGoal = getClientCookie(STORAGE_GOAL_KEY)

            let needsRouterRefresh = false

            // Check mount-time URL search params for "goal"
            const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
            const queryGoal = searchParams?.get("goal")
            const validQueryGoalIds = queryGoal ? parseGoalIds(queryGoal, true) : []
            const hasValidQueryGoal = validQueryGoalIds.length > 0

            if (hasValidQueryGoal) {
                const serialized = serializeGoalIds(validQueryGoalIds)
                applyGoalsFromRaw(serialized, null)
                try {
                    localStorage.setItem(STORAGE_GOAL_KEY, serialized)
                    localStorage.removeItem(STORAGE_SUBGOAL_KEY)
                } catch {}
                setGuestGoalCookie(serialized)

                // Ensure query param wins over later GET /api/user/goal sync
                cachedUserGoalPromise = Promise.resolve({
                    goal: { goalId: serialized, goalIds: validQueryGoalIds, subGoalId: null },
                })

                if (cookieGoal !== serialized) {
                    const mismatchKey = `${serialized}:::${cookieGoal}`
                    if (lastRefreshedMismatchRef.current !== mismatchKey) {
                        lastRefreshedMismatchRef.current = mismatchKey
                        needsRouterRefresh = true
                    }
                } else {
                    lastRefreshedMismatchRef.current = null
                }

                if (session?.user?.id) {
                    fetch("/api/user/goal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            goalId: serialized,
                            goalIds: validQueryGoalIds,
                            subGoalId: null,
                        }),
                    }).catch(() => {})
                } else {
                    pendingQueryGoalSyncRef.current = { serialized, ids: validQueryGoalIds }
                }

                // Strip only the "goal" param with window.history.replaceState
                if (searchParams) {
                    searchParams.delete("goal")
                    const remaining = searchParams.toString()
                    const newUrl = window.location.pathname + (remaining ? `?${remaining}` : "") + window.location.hash
                    window.history.replaceState(null, "", newUrl)
                }
            } else if (savedGoalId) {
                applyGoalsFromRaw(savedGoalId, savedSubGoalId)
                if (cookieGoal !== savedGoalId) {
                    setGuestGoalCookie(savedGoalId)
                    const mismatchKey = `${savedGoalId}:::${cookieGoal}`
                    if (lastRefreshedMismatchRef.current !== mismatchKey) {
                        lastRefreshedMismatchRef.current = mismatchKey
                        needsRouterRefresh = true
                    }
                } else {
                    lastRefreshedMismatchRef.current = null
                }
            } else if (cookieGoal) {
                applyGoalsFromRaw(cookieGoal)
                try {
                    localStorage.setItem(STORAGE_GOAL_KEY, cookieGoal)
                } catch {}
                lastRefreshedMismatchRef.current = null
            } else {
                lastRefreshedMismatchRef.current = null
            }

            if (needsRouterRefresh) {
                router.refresh()
            }

            setIsLoaded(true)

            // Sync with backend (DB source of truth) for authenticated users
            const scheduleSync = () => {
                if (status === "unauthenticated" || (!session?.user?.id && status !== "loading")) {
                    return
                }
                if (!cachedUserGoalPromise) {
                    cachedUserGoalPromise = fetch("/api/user/goal")
                        .then((res) => res.json())
                        .catch(() => null)
                }
                cachedUserGoalPromise.then((data) => {
                    if (data?.goal?.goalId || data?.goal?.goalIds) {
                        const targetRaw = data.goal.goalIds ? data.goal.goalIds.join(",") : data.goal.goalId
                        applyGoalsFromRaw(targetRaw, data.goal.subGoalId)
                        try {
                            localStorage.setItem(STORAGE_GOAL_KEY, targetRaw)
                        } catch {}
                        setGuestGoalCookie(targetRaw)
                    }
                    setIsLoaded(true)
                })
            }

            if (typeof window !== "undefined" && "requestIdleCallback" in window) {
                (window as any).requestIdleCallback(scheduleSync, { timeout: 2000 })
            } else {
                setTimeout(scheduleSync, 500)
            }
        } catch (e) {
            console.warn("Failed to load saved goal from localStorage:", e)
            setIsLoaded(true)
        }

        const handleCustomGoalChange = (e: any) => {
            invalidateCachedUserGoalPromise()
            const gid = e?.detail?.goalId
            if (gid) {
                applyGoalsFromRaw(gid)
                try {
                    localStorage.setItem(STORAGE_GOAL_KEY, gid)
                } catch {}
                setGuestGoalCookie(gid)
                router.refresh()
            }
        }
        window.addEventListener("goalChange", handleCustomGoalChange)

        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_GOAL_KEY || e.key === STORAGE_SUBGOAL_KEY || !e.key) {
                invalidateCachedUserGoalPromise()
                const savedGoalId = localStorage.getItem(STORAGE_GOAL_KEY)
                const savedSubGoalId = localStorage.getItem(STORAGE_SUBGOAL_KEY)
                if (savedGoalId) {
                    applyGoalsFromRaw(savedGoalId, savedSubGoalId)
                }
            }
        }
        window.addEventListener("storage", handleStorage)

        return () => {
            window.removeEventListener("goalChange", handleCustomGoalChange)
            window.removeEventListener("storage", handleStorage)
        }
    }, [applyGoalsFromRaw, router, session?.user?.id, status])

    // Apply ?goal= on client-side navigations after the provider is already mounted.
    // The effect above handles hard loads and strips the param; this effect skips its
    // first run so the same selection is never applied twice on mount.
    const pathname = usePathname()
    const didRunQueryGoalEffectRef = useRef(false)
    const lastAppliedQueryGoalRef = useRef<string | null>(null)

    useEffect(() => {
        if (!didRunQueryGoalEffectRef.current) {
            didRunQueryGoalEffectRef.current = true
            return
        }
        if (typeof window === "undefined") return

        const queryGoal = getQueryGoal(window.location.search)
        if (!queryGoal) {
            lastAppliedQueryGoalRef.current = null
            return
        }
        if (lastAppliedQueryGoalRef.current === queryGoal.serialized) return
        lastAppliedQueryGoalRef.current = queryGoal.serialized

        const cookieGoal = getClientCookie(STORAGE_GOAL_KEY)
        applyGoalsFromRaw(queryGoal.serialized, null)
        try {
            localStorage.setItem(STORAGE_GOAL_KEY, queryGoal.serialized)
            localStorage.removeItem(STORAGE_SUBGOAL_KEY)
        } catch {}
        setGuestGoalCookie(queryGoal.serialized)

        // Keep the query selection ahead of the later GET /api/user/goal sync.
        cachedUserGoalPromise = Promise.resolve({
            goal: { goalId: queryGoal.serialized, goalIds: queryGoal.ids, subGoalId: null },
        })

        if (session?.user?.id) {
            fetch("/api/user/goal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goalId: queryGoal.serialized,
                    goalIds: queryGoal.ids,
                    subGoalId: null,
                }),
            }).catch(() => {})
        } else {
            pendingQueryGoalSyncRef.current = { serialized: queryGoal.serialized, ids: queryGoal.ids }
        }

        if (cookieGoal !== queryGoal.serialized) {
            router.refresh()
        }

        const remaining = stripGoalParam(window.location.search)
        window.history.replaceState(null, "", window.location.pathname + remaining + window.location.hash)
    }, [pathname, applyGoalsFromRaw, router, session?.user?.id])

    const persistAbortControllerRef = useRef<AbortController | null>(null)

    const persistGoals = useCallback(
        async (ids: string[], subGoal: SubGoal | null = null) => {
            const serialized = serializeGoalIds(ids)
            cachedUserGoalPromise = Promise.resolve({
                goal: { goalId: serialized, goalIds: ids, subGoalId: subGoal?.id },
            })
            setSelectedGoalIds(ids)
            selectedGoalIdsRef.current = ids
            setSelectedSubGoal(subGoal)

            // Save to localStorage
            try {
                localStorage.setItem(STORAGE_GOAL_KEY, serialized)
                if (subGoal) {
                    localStorage.setItem(STORAGE_SUBGOAL_KEY, subGoal.id)
                } else {
                    localStorage.removeItem(STORAGE_SUBGOAL_KEY)
                }
            } catch (e) {
                console.warn("Failed to save goal to localStorage:", e)
            }

            // Always write client cookie (Rule a & Rule 1)
            setGuestGoalCookie(serialized)

            // If guest (not authenticated), do NOT call auth-only POST /api/user/goal
            const isGuest = status === "unauthenticated" || !session?.user?.id
            if (isGuest) {
                router.refresh()
                return
            }

            if (persistAbortControllerRef.current) {
                persistAbortControllerRef.current.abort()
            }
            const controller = new AbortController()
            persistAbortControllerRef.current = controller

            // Save to user API (DB source of truth and cookie)
            try {
                const res = await fetch("/api/user/goal", {
                    method: "POST",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        goalId: serialized,
                        goalIds: ids,
                        subGoalId: subGoal?.id,
                    }),
                })
                if (res.ok) {
                    // Refresh server components with updated cookie and DB state
                    router.refresh()
                }
            } catch (err: any) {
                if (err?.name !== "AbortError") {
                    console.warn("Failed to persist goal:", err)
                }
            }
        },
        [router, session?.user?.id, status]
    )

    const selectGoal = useCallback(
        (goal: Goal, subGoal: SubGoal | null = null) => {
            persistGoals([goal.id], subGoal)
            setIsGoalModalOpen(false)
        },
        [persistGoals]
    )

    const toggleGoal = useCallback(
        (goal: Goal) => {
            const current = selectedGoalIdsRef.current
            let next: string[]
            if (current.includes(goal.id)) {
                // Keep at least one goal
                if (current.length <= 1) return
                next = current.filter((id) => id !== goal.id)
            } else {
                next = [...current, goal.id]
            }
            selectedGoalIdsRef.current = next
            persistGoals(next, null)
        },
        [persistGoals]
    )

    const setGoalIds = useCallback((goalIds: string[]) => {
        if (goalIds.length === 0) return
        persistGoals(goalIds, null)
    }, [persistGoals])

    const openGoalModal = useCallback(() => setIsGoalModalOpen(true), [])
    const closeGoalModal = useCallback(() => setIsGoalModalOpen(false), [])

    const contextValue = useMemo(
        () => ({
            selectedGoal,
            selectedGoals,
            selectedGoalIds,
            selectedSubGoal,
            isLoaded,
            allGoalsConfig: goalsConfig as any,
            isGoalModalOpen,
            openGoalModal,
            closeGoalModal,
            selectGoal,
            toggleGoal,
            setGoalIds,
        }),
        [
            selectedGoal,
            selectedGoals,
            selectedGoalIds,
            selectedSubGoal,
            isLoaded,
            isGoalModalOpen,
            openGoalModal,
            closeGoalModal,
            selectGoal,
            toggleGoal,
            setGoalIds,
        ]
    )

    return (
        <GoalContext.Provider value={contextValue}>
            {children}
        </GoalContext.Provider>
    )
}

export function useGoal() {
    const context = useContext(GoalContext)
    if (!context) {
        throw new Error("useGoal must be used within a GoalProvider")
    }
    return context
}
