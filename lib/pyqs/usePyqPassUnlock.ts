"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import { usePassPurchaseModal } from "@/lib/payments/usePassPurchaseModal"
import { PASS_PRICE_INR } from "@/lib/payments/pass-plan"

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
  /** Gates the auto-open after a guest logs in through the passPopup return path. */
  isAuthenticated?: boolean
  /** Database-backed Pass entitlement. When true the modal never opens. */
  hasActivePass?: boolean
  /** Runs after the server verified the payment (e.g. re-probe a PDF). */
  onUnlocked?: () => void
}

/**
 * PYQ surface adapter over the one shared Pass hook. All open/close state,
 * focus return, the `passPopup=1` return-path handling and the once-per-tab
 * auto-open guard live in usePassPurchaseModal; this only adds the
 * "re-probe after payment" callback.
 *
 * Guests are never redirected here: the PYQ screens render their own login
 * affordance, so `redirectGuests` is off to keep that behaviour.
 */
export function usePyqPassUnlock(options: UsePyqPassUnlockOptions = {}) {
  const { autoOpenEnabled = false, isAuthenticated, hasActivePass = false, onUnlocked } = options
  const router = useRouter()
  const { isProcessing } = useSamePageBuyNow()
  const [error] = useState<string | null>(null)
  const onUnlockedRef = useRef(onUnlocked)
  const pendingSuccessCallbackRef = useRef<(() => void) | undefined>(undefined)

  onUnlockedRef.current = onUnlocked

  const {
    isOpen: isPassModalOpen,
    openPassModal,
    closePassModal,
  } = usePassPurchaseModal({
    autoOpenEnabled,
    isAuthenticated,
    hasActivePass,
    redirectGuests: false,
  })

  const openPassCheckout = useCallback(
    (onSuccess?: () => void) => {
      pendingSuccessCallbackRef.current = onSuccess
      openPassModal()
    },
    [openPassModal]
  )

  const handleModalSuccess = useCallback(() => {
    router.refresh()
    onUnlockedRef.current?.()
    pendingSuccessCallbackRef.current?.()
    pendingSuccessCallbackRef.current = undefined
  }, [router])

  return {
    openPassCheckout,
    isProcessing,
    error,
    isPassModalOpen,
    closePassModal,
    handleModalSuccess,
  }
}
