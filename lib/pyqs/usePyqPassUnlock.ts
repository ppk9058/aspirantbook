"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import { PASS_PRICE_INR } from "@/lib/payments/pass-plan"
import { consumePassPopupParam, hasPendingPassPopup, PASS_POPUP_HANDLED_STORAGE_KEY } from "@/lib/pyqs/pass-popup"

/**
 * The Pass checkout item. Same shape the /pricing "Get Pass" button sends, so
 * this reuses the single Razorpay integration in useSamePageBuyNow: YEARLY
 * only, Rs 499 from PASS_PRICE_INR, no coupon, no redirect to /checkout.
 */
export const PYQ_PASS_BUY_ITEM = {
  type: "subscription" as const,
  id: "YEARLY",
  title: "AspirantBook Pass (Yearly)",
  price: PASS_PRICE_INR,
  isFree: false,
}

interface UsePyqPassUnlockOptions {
  /** True when the current page still has something locked behind the Pass. */
  autoOpenEnabled?: boolean
  /** Guests are sent to /login instead of opening checkout. */
  isAuthenticated?: boolean
  /** Runs after the server verified the payment (e.g. re-probe a PDF). */
  onUnlocked?: () => void
}

/**
 * Opens the Rs 499 yearly Pass popup on the same page, and (once) auto-opens it
 * after a guest logs in through the `passPopup=1` return path.
 */
export function usePyqPassUnlock(options: UsePyqPassUnlockOptions = {}) {
  const { autoOpenEnabled = false, isAuthenticated = false, onUnlocked } = options
  const router = useRouter()
  const { handleBuyNow, isProcessing } = useSamePageBuyNow()
  const [error, setError] = useState<string | null>(null)
  const handledRef = useRef(false)
  const onUnlockedRef = useRef(onUnlocked)

  onUnlockedRef.current = onUnlocked

  const openPassCheckout = useCallback(async (onSuccess?: () => void) => {
    setError(null)
    await handleBuyNow(
      PYQ_PASS_BUY_ITEM,
      () => {
        // Server verified the payment: refresh the same page into the unlocked
        // state. Never redirect to /subscription or /checkout.
        router.refresh()
        onUnlockedRef.current?.()
        onSuccess?.()
      },
      {
        onError: (message) => setError(message),
      }
    )
  }, [handleBuyNow, router])

  useEffect(() => {
    if (!autoOpenEnabled || !isAuthenticated || handledRef.current) return
    if (typeof window === "undefined") return

    const { requested, cleanPath } = consumePassPopupParam(
      `${window.location.pathname}${window.location.search}`
    )
    if (!requested) return

    let storageHandled = false
    try {
      storageHandled = window.sessionStorage.getItem(PASS_POPUP_HANDLED_STORAGE_KEY) === "1"
    } catch (storageError) {
      console.warn("PYQ Pass popup: sessionStorage unavailable", storageError)
    }

    const pending = hasPendingPassPopup({
      requested,
      alreadyHandled: handledRef.current || storageHandled,
      passUnlockRequired: true,
    })

    handledRef.current = true
    // Consume the trigger first so refresh/back cannot reopen the popup.
    router.replace(cleanPath, { scroll: false })

    if (!pending) return

    try {
      window.sessionStorage.setItem(PASS_POPUP_HANDLED_STORAGE_KEY, "1")
    } catch (storageError) {
      console.warn("PYQ Pass popup: sessionStorage unavailable", storageError)
    }
    void openPassCheckout()
  }, [autoOpenEnabled, isAuthenticated, openPassCheckout, router])

  return { openPassCheckout, isProcessing, error }
}
