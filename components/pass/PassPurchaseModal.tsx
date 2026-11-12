"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  X,
  CheckCircle2,
  Check,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { PASS_PRICE_INR } from "@/lib/payments/pass-plan"
import { PASS_INCLUDED_FEATURES } from "@/lib/payments/pass-marketing"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import { PYQ_PASS_BUY_ITEM } from "@/lib/pyqs/usePyqPassUnlock"

export interface PassPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  triggerRef?: React.RefObject<HTMLElement | null>
}

export default function PassPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  triggerRef,
}: PassPurchaseModalProps) {
  const [mounted, setMounted] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<
    "idle" | "opening" | "cancelled" | "failed" | "success"
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const payButtonRef = useRef<HTMLButtonElement>(null)

  const router = useRouter()
  const { handleBuyNow, isProcessing } = useSamePageBuyNow()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Focus trap & Escape key handler
  useEffect(() => {
    if (!isOpen) return

    // Focus the pay button or close button initially
    const focusTimer = setTimeout(() => {
      if (payButtonRef.current) {
        payButtonRef.current.focus()
      } else if (closeButtonRef.current) {
        closeButtonRef.current.focus()
      }
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      clearTimeout(focusTimer)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  // Handle Pay button click
  const handlePay = useCallback(async () => {
    setCheckoutStatus("opening")
    setErrorMessage(null)

    await handleBuyNow(
      PYQ_PASS_BUY_ITEM,
      () => {
        setCheckoutStatus("success")
        onClose()
        onSuccess?.()
        router.refresh()
      },
      {
        onOpening: () => {
          setCheckoutStatus("opening")
          setErrorMessage(null)
        },
        onSuccess: () => {
          setCheckoutStatus("success")
          onClose()
          onSuccess?.()
          router.refresh()
        },
        onDismiss: () => {
          setCheckoutStatus("cancelled")
        },
        onError: (err) => {
          setCheckoutStatus("failed")
          setErrorMessage(err || "Payment failed. Please try again.")
        },
      }
    )
  }, [handleBuyNow, onClose, onSuccess, router])

  if (!mounted || !isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pass-modal-heading"
        data-testid="pass-modal"
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[92dvh] my-auto"
      >
        {/* Left Panel: aspirantBook brand-blue gradient + benefits list */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-[#003B73] via-[#004e92] to-[#00A896] text-white p-5 sm:p-7 flex flex-col justify-between shrink-0">
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-2 mb-3">
              <span className="font-extrabold text-base tracking-tight text-white">
                aspirant<span className="text-cyan-300">book</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[10px] font-black text-white tracking-widest uppercase border border-white/20">
                PASS
              </span>
            </div>

            <h2
              id="pass-modal-heading"
              className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug mb-1"
            >
              aspirantBook Pass
            </h2>
            <p className="text-xs text-white/80 font-medium mb-6">
              One Pass to ace all exams. Complete access to test series, PYQs and mock assessments.
            </p>

            {/* Benefits list (using ONLY real items from PASS_INCLUDED_FEATURES) */}
            <div className="space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-200">
                Pass Benefits
              </p>
              <ul className="space-y-2.5">
                {PASS_INCLUDED_FEATURES.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-white/95 leading-relaxed">
                    <div className="w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pt-6 text-[11px] text-white/70 border-t border-white/10 mt-6">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Official verified test series & instant solutions</span>
          </div>
        </div>

        {/* Right Panel: Plan card + Pricing + Pay button */}
        <div className="w-full md:w-7/12 p-5 sm:p-7 flex flex-col justify-between bg-white dark:bg-slate-900 text-slate-900 dark:text-white overflow-y-auto">
          <div>
            {/* Top row with Title & Close (X) button */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Pick your plan
              </h3>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                data-testid="pass-modal-close"
                aria-label="Close modal"
                className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plan Card */}
            <div className="mt-4 p-4 sm:p-5 rounded-2xl border-2 border-[#1448d8] dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 space-y-3 relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[#1448d8] flex items-center justify-center mt-0.5 shrink-0 bg-white dark:bg-slate-900">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1448d8]" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                      Yearly aspirantBook Pass
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Valid for 365 days
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1">
                      One-time payment • No auto-renewal
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl sm:text-3xl font-black text-[#1448d8] dark:text-blue-400">
                    ₹{PASS_PRICE_INR}
                  </span>
                </div>
              </div>
            </div>

            {/* Inline Error / Cancel Status */}
            {checkoutStatus === "failed" && errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {checkoutStatus === "cancelled" && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Payment cancelled. You can proceed whenever you are ready.</span>
              </div>
            )}
          </div>

          {/* Sticky Bottom Area: To Pay + Pay button */}
          <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                To Pay
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Rs {PASS_PRICE_INR}
              </span>
            </div>

            <button
              ref={payButtonRef}
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              data-testid="pass-modal-pay-btn"
              className="w-full min-h-[50px] py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Opening Checkout...</span>
                </>
              ) : checkoutStatus === "failed" || checkoutStatus === "cancelled" ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Payment • Pay Rs {PASS_PRICE_INR}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Pay Rs {PASS_PRICE_INR}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
