"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"

export interface PassStatus {
  /** True only when the database says the user holds an active paid Pass. */
  hasActivePass: boolean
  /** True while the server value is still being resolved. */
  isLoading: boolean
  /** True when the server value could not be resolved (fail closed, neutral UI). */
  error: boolean
}

/**
 * Client adapter for GET /api/pass-status.
 *
 * The entitlement itself is ALWAYS resolved on the server from the database by
 * hasActivePass(). This hook only carries that value to client components; it
 * never reads session.user.role or session.user.subscriptionStatus.
 */
export function usePassStatus(): PassStatus {
  const { status, data: session } = useSession()
  const userId = session?.user?.id

  const [state, setState] = useState<PassStatus>({
    hasActivePass: false,
    isLoading: true,
    error: false,
  })

  const load = useCallback(
    async (signal: { cancelled: boolean }) => {
      setState({ hasActivePass: false, isLoading: true, error: false })
      try {
        const res = await fetch("/api/pass-status", {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        })
        const json = await res.json().catch(() => null)
        if (signal.cancelled) return

        if (res.status === 401) {
          setState({ hasActivePass: false, isLoading: false, error: false })
          return
        }

        if (!res.ok || !json || typeof json.hasActivePass !== "boolean") {
          setState({ hasActivePass: false, isLoading: false, error: true })
          return
        }

        setState({ hasActivePass: json.hasActivePass, isLoading: false, error: false })
      } catch (err) {
        if (signal.cancelled) return
        console.error("[usePassStatus] failed to load pass entitlement:", err)
        setState({ hasActivePass: false, isLoading: false, error: true })
      }
    },
    []
  )

  useEffect(() => {
    if (status === "loading") return
    const signal = { cancelled: false }
    void load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [status, userId, load])

  return state
}
