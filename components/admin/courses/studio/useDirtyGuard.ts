"use client"

import { useEffect } from "react"

/**
 * Warns before leaving the page with unsaved studio changes.
 *
 * Only `beforeunload` is used: Next's client router cannot be intercepted
 * reliably from a nested editor, and silently blocking in-app navigation is
 * worse than a browser prompt on close/reload.
 */
export function useDirtyGuard(isDirty: boolean, message = "You have unsaved course changes.") {
  useEffect(() => {
    if (!isDirty || typeof window === "undefined") return

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Chrome requires returnValue to be set.
      event.returnValue = message
      return message
    }

    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty, message])
}
