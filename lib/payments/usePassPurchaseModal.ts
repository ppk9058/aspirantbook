"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  buildPassLoginHref,
  consumePassPopupParam,
  hasPendingPassPopup,
  PASS_POPUP_HANDLED_STORAGE_KEY,
} from "@/lib/pyqs/pass-popup"

export interface UsePassPurchaseModalOptions {
  /** Callback fired after payment is successfully verified. */
  onSuccess?: () => void
  /** Explicit authentication flag if already checked by the caller. */
  isAuthenticated?: boolean
  /** Whether auto-open on passPopup=1 return param is enabled. Default true. */
  autoOpenEnabled?: boolean
  /** Custom return path for guest login redirection. Defaults to current path. */
  returnPath?: string
  /** If the user already has an active pass, modal should never open. */
  hasActivePass?: boolean
}

/**
 * Shared hook to control the Pass Purchase Modal open/close state,
 * focus return tracking, guest redirection, and post-login auto-open.
 */
export function usePassPurchaseModal(options: UsePassPurchaseModalOptions = {}) {
  const {
    onSuccess,
    isAuthenticated: callerIsAuthenticated,
    autoOpenEnabled = true,
    returnPath: customReturnPath,
    hasActivePass = false,
  } = options

  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const handledAutoOpenRef = useRef(false)

  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()

  const isAuthenticated =
    callerIsAuthenticated !== undefined
      ? callerIsAuthenticated
      : status === "authenticated" || Boolean((session as any)?.user?.id)

  const openPassModal = useCallback(
    (triggerElement?: HTMLElement | null) => {
      // If user already has an active Pass, do not open
      if (hasActivePass) {
        return
      }

      if (triggerElement) {
        triggerRef.current = triggerElement
      } else if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        triggerRef.current = document.activeElement
      }

      // Guest user: route to login with safe return path + passPopup=1
      if (!isAuthenticated && status !== "loading") {
        const targetPath =
          customReturnPath ||
          (typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : pathname || "/test-series")
        router.push(buildPassLoginHref(targetPath))
        return
      }

      setIsOpen(true)
    },
    [hasActivePass, isAuthenticated, status, customReturnPath, pathname, router]
  )

  const closePassModal = useCallback(() => {
    setIsOpen(false)
    if (triggerRef.current && typeof triggerRef.current.focus === "function") {
      try {
        triggerRef.current.focus()
      } catch {}
    }
  }, [])

  // Auto-open after returning from guest login with passPopup=1
  useEffect(() => {
    if (!autoOpenEnabled || !isAuthenticated || hasActivePass || handledAutoOpenRef.current) {
      return
    }
    if (typeof window === "undefined") return

    const { requested, cleanPath } = consumePassPopupParam(
      `${window.location.pathname}${window.location.search}`
    )
    if (!requested) return

    let storageHandled = false
    try {
      storageHandled = window.sessionStorage.getItem(PASS_POPUP_HANDLED_STORAGE_KEY) === "1"
    } catch {}

    const pending = hasPendingPassPopup({
      requested,
      alreadyHandled: handledAutoOpenRef.current || storageHandled,
      passUnlockRequired: !hasActivePass,
    })

    handledAutoOpenRef.current = true
    router.replace(cleanPath, { scroll: false })

    if (!pending) return

    try {
      window.sessionStorage.setItem(PASS_POPUP_HANDLED_STORAGE_KEY, "1")
    } catch {}

    setIsOpen(true)
  }, [autoOpenEnabled, isAuthenticated, hasActivePass, router])

  return {
    isOpen,
    openPassModal,
    closePassModal,
    triggerRef,
    onSuccess,
  }
}
