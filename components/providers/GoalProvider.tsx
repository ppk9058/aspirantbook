"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import goalsConfig from "@/data/goals-config.json"
import { parseGoalIds, serializeGoalIds } from "@/lib/goals/student-goals"

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

export function GoalProvider({ children }: { children: React.ReactNode }) {
    const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([DEFAULT_GOAL.id])
    const [selectedSubGoal, setSelectedSubGoal] = useState<SubGoal | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)

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

    // Load persisted selection from localStorage or user API
    useEffect(() => {
        // Sync with backend (DB source of truth)
        const scheduleSync = () => {
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
                }
                setIsLoaded(true)
            })
        }

        try {
            const savedGoalId = localStorage.getItem(STORAGE_GOAL_KEY)
            const savedSubGoalId = localStorage.getItem(STORAGE_SUBGOAL_KEY)

            if (savedGoalId) {
                applyGoalsFromRaw(savedGoalId, savedSubGoalId)
            }
            setIsLoaded(true)

            if (typeof window !== "undefined" && "requestIdleCallback" in window) {
                (window as any).requestIdleCallback(scheduleSync, { timeout: 2000 })
            } else {
                setTimeout(scheduleSync, 500)
            }
        } catch (e) {
            console.warn("Failed to load saved goal from localStorage:", e)
            setIsLoaded(true)
        }

        const handleStorage = () => {
            cachedUserGoalPromise = null
            scheduleSync()
        }
        window.addEventListener("storage", handleStorage)

        const handleCustomGoalChange = (e: any) => {
            cachedUserGoalPromise = null
            const gid = e?.detail?.goalId
            if (gid) {
                applyGoalsFromRaw(gid)
                localStorage.setItem(STORAGE_GOAL_KEY, gid)
            }
        }
        window.addEventListener("goalChange", handleCustomGoalChange)
        return () => {
            window.removeEventListener("storage", handleStorage)
            window.removeEventListener("goalChange", handleCustomGoalChange)
        }
    }, [applyGoalsFromRaw])

    const persistGoals = useCallback((ids: string[], subGoal: SubGoal | null = null) => {
        const serialized = serializeGoalIds(ids)
        setSelectedGoalIds(ids)
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

        // Save to user API (DB source of truth)
        fetch("/api/user/goal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                goalId: serialized,
                goalIds: ids,
                subGoalId: subGoal?.id,
            }),
        }).catch(() => {})
    }, [])

    const selectGoal = useCallback((goal: Goal, subGoal: SubGoal | null = null) => {
        persistGoals([goal.id], subGoal)
        setIsGoalModalOpen(false)
    }, [persistGoals])

    const toggleGoal = useCallback((goal: Goal) => {
        setSelectedGoalIds((prev) => {
            let next: string[]
            if (prev.includes(goal.id)) {
                // Keep at least one goal
                if (prev.length <= 1) return prev
                next = prev.filter((id) => id !== goal.id)
            } else {
                next = [...prev, goal.id]
            }
            persistGoals(next, null)
            return next
        })
    }, [persistGoals])

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
