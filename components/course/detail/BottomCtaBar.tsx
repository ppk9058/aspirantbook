"use client"

import { Play, Tag } from "lucide-react"

interface BottomCtaBarProps {
  visible: boolean
  isEnrolled: boolean
  isFree: boolean
  finalPrice: number
  originalPrice?: number | null
  isProcessing: boolean
  enrollLabel?: string
  startLabel?: string
  onBuy: () => void
  onStart: () => void
}

/**
 * Phone-only sticky action bar (safe-area aware). Desktop uses the sticky card
 * in the sidebar, so this bar is hidden from `lg` upwards.
 */
export function BottomCtaBar({
  visible,
  isEnrolled,
  isFree,
  finalPrice,
  originalPrice,
  isProcessing,
  enrollLabel = "Enroll now",
  startLabel = "Start learning",
  onBuy,
  onStart,
}: BottomCtaBarProps) {
  if (!visible) return null

  const free = Boolean(isFree)
  const showStrike = !free && typeof originalPrice === "number" && originalPrice > finalPrice

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          {isEnrolled ? (
            <p className="text-xs font-bold text-emerald-700">You are enrolled</p>
          ) : free ? (
            <p className="text-lg font-black text-emerald-600">FREE</p>
          ) : finalPrice > 0 ? (
            <p className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-lg font-black text-gray-900">₹{finalPrice.toLocaleString("en-IN")}</span>
              {showStrike && (
                <span className="text-xs text-gray-600 line-through">
                  ₹{(originalPrice as number).toLocaleString("en-IN")}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800">
                <Tag className="h-3 w-3" aria-hidden="true" /> limited
              </span>
            </p>
          ) : (
            <p className="text-sm font-bold text-gray-500 italic">Price not set</p>
          )}
        </div>

        <button
          type="button"
          onClick={isEnrolled || free ? onStart : onBuy}
          disabled={isProcessing}
          className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-[color:var(--cd-olive)] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEnrolled && <Play className="h-4 w-4 fill-white" aria-hidden="true" />}
          {isProcessing ? "Please wait…" : isEnrolled ? startLabel : free ? startLabel : enrollLabel}
        </button>
      </div>
    </div>
  )
}
