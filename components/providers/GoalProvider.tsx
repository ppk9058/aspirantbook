"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import goalsConfig from "@/data/goals-config.json"

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
    selectedSubGoal: SubGoal | null
    allGoalsConfig: {
        popularGoals: Goal[]
        categories: GoalCategory[]
        otherOfferings: OtherOffering[]
    }
    isGoalModalOpen: boolean
    openGoalModal: () => void
    closeGoalModal: () => void
    selectGoal: (goal: Goal, subGoal?: SubGoal | null) => void
}

const DEFAULT_GOAL: Goal = (goalsConfig.popularGoals[0] as Goal) || {
    id: "upsc",
    name: "UPSC",
    fullName: "UPSC Civil Services Examination",
    icon: "Landmark",
    tags: ["upsc", "civil-services"],
}

const GoalContext = createContext<GoalContextType>({
    selectedGoal: DEFAULT_GOAL,
    selectedSubGoal: null,
    allGoalsConfig: goalsConfig as any,
    isGoalModalOpen: false,
    openGoalModal: () => {},
    closeGoalModal: () => {},
    selectGoal: () => {},
})

const STORAGE_GOAL_KEY = "trillion_selected_goal"
const STORAGE_SUBGOAL_KEY = "trillion_selected_sub_goal"
let cachedUserGoalPromise: Promise<any> | null = null

export function GoalProvider({ children }: { children: React.ReactNode }) {
    const [selectedGoal, setSelectedGoal] = useState<Goal>(DEFAULT_GOAL)
    const [selectedSubGoal, setSelectedSubGoal] = useState<SubGoal | null>(null)
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
    const applyGoalById = (goalId: string, subGoalId?: string | null) => {
        // Search in popular goals first
        const popular = goalsConfig.popularGoals.find(g => g.id === goalId)
        if (popular) {
            setSelectedGoal(popular as Goal)
            if (subGoalId && (popular as any).subGoals) {
                const foundSub = (popular as any).subGoals.find((s: any) => s.id === subGoalId)
                if (foundSub) setSelectedSubGoal(foundSub)
            } else {
                setSelectedSubGoal(null)
            }
            return
        }
        // Search in all categories
        for (const cat of goalsConfig.categories) {
            const found = cat.goals.find(g => g.id === goalId)
            if (found) {
                setSelectedGoal(found as Goal)
                setSelectedSubGoal(null)
                return
            }
        }
    }

    // Load persisted selection from localStorage or user API
    useEffect(() => {
        try {
            const savedGoalId = localStorage.getItem(STORAGE_GOAL_KEY)
            const savedSubGoalId = localStorage.getItem(STORAGE_SUBGOAL_KEY)

            if (savedGoalId) {
                applyGoalById(savedGoalId, savedSubGoalId)
            }

            // Sync with backend in idle time (off critical rendering path)
            const scheduleSync = () => {
                if (!cachedUserGoalPromise) {
                    cachedUserGoalPromise = fetch("/api/user/goal")
                        .then((res) => res.json())
                        .catch(() => null)
                }
                cachedUserGoalPromise.then((data) => {
                    if (data?.goal?.goalId) {
                        applyGoalById(data.goal.goalId, data.goal.subGoalId)
                        try {
                            localStorage.setItem(STORAGE_GOAL_KEY, data.goal.goalId)
                        } catch {}
                    }
                })
            }

            if (typeof window !== "undefined" && "requestIdleCallback" in window) {
                (window as any).requestIdleCallback(scheduleSync, { timeout: 2000 })
            } else {
                setTimeout(scheduleSync, 500)
            }
        } catch (e) {
            console.warn("Failed to load saved goal from localStorage:", e)
        }

        const handleCustomGoalChange = (e: any) => {
            const gid = e?.detail?.goalId
            if (gid) {
                applyGoalById(gid)
                localStorage.setItem(STORAGE_GOAL_KEY, gid)
            }
        }
        window.addEventListener("goalChange", handleCustomGoalChange)
        return () => window.removeEventListener("goalChange", handleCustomGoalChange)
    }, [])

    const selectGoal = useCallback((goal: Goal, subGoal: SubGoal | null = null) => {
        setSelectedGoal(goal)
        setSelectedSubGoal(subGoal)

        // Save to localStorage
        try {
            localStorage.setItem(STORAGE_GOAL_KEY, goal.id)
            if (subGoal) {
                localStorage.setItem(STORAGE_SUBGOAL_KEY, subGoal.id)
            } else {
                localStorage.removeItem(STORAGE_SUBGOAL_KEY)
            }
        } catch (e) {
            console.warn("Failed to save goal to localStorage:", e)
        }

        // Save to user API
        fetch("/api/user/goal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                goalId: goal.id,
                subGoalId: subGoal?.id,
            }),
        }).catch(() => {})

        setIsGoalModalOpen(false)
    }, [])

    const openGoalModal = useCallback(() => setIsGoalModalOpen(true), [])
    const closeGoalModal = useCallback(() => setIsGoalModalOpen(false), [])

    const contextValue = useMemo(
        () => ({
            selectedGoal,
            selectedSubGoal,
            allGoalsConfig: goalsConfig as any,
            isGoalModalOpen,
            openGoalModal,
            closeGoalModal,
            selectGoal,
        }),
        [selectedGoal, selectedSubGoal, isGoalModalOpen, openGoalModal, closeGoalModal, selectGoal]
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
