"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react"

interface AuthwallGateProps {
  title?: string | null
  subtitle?: string | null
  moduleName?: string
  totalItemsCount?: number
  previewCount?: number
  effectivePercentage?: number
  customCtaUrl?: string
}

export function AuthwallGate({
  title,
  subtitle,
  moduleName = "Content",
  totalItemsCount,
  previewCount,
  effectivePercentage = 20,
  customCtaUrl,
}: AuthwallGateProps) {
  const pathname = usePathname()
  const [returnUrl, setReturnUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setReturnUrl(window.location.pathname + window.location.search)
    }
  }, [pathname])

  const handleCtaClick = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("authwall_return_url", window.location.href)
        sessionStorage.setItem("authwall_scroll_y", String(window.scrollY))
        sessionStorage.setItem("authwall_gated_module", moduleName)
      } catch {
        // Safe storage write fallback
      }
    }
  }

  const loginHref = customCtaUrl || `/login?callbackUrl=${encodeURIComponent(returnUrl || pathname)}`

  const defaultTitle = title || `Read the complete ${moduleName} for free`
  const defaultSubtitle =
    subtitle ||
    `You are viewing a ${effectivePercentage}% preview. Create a free account or sign in to continue reading with full solutions, explanations, and bookmarks.`

  return (
    <section
      role="region"
      aria-label="Content Gate"
      className="relative w-full mt-6 select-none"
    >
      {/* Blurred Placeholder Skeleton Beneath Card */}
      <div
        aria-hidden="true"
        className="pointer-events-none filter blur-[6px] opacity-40 select-none overflow-hidden space-y-3.5 max-h-56 border border-transparent"
      >
        <div className="h-4 w-5/6 bg-gray-400 dark:bg-gray-600 rounded-md animate-pulse" />
        <div className="h-4 w-full bg-gray-400 dark:bg-gray-600 rounded-md" />
        <div className="h-4 w-11/12 bg-gray-400 dark:bg-gray-600 rounded-md" />
        <div className="h-24 w-full bg-gray-300 dark:bg-gray-700 rounded-xl" />
        <div className="h-4 w-4/6 bg-gray-400 dark:bg-gray-600 rounded-md" />
        <div className="h-4 w-3/4 bg-gray-400 dark:bg-gray-600 rounded-md" />
      </div>

      {/* Non-dismissible Glassdoor / Quora Style CTA Card overlay */}
      <div className="absolute inset-0 top-0 flex items-center justify-center bg-gradient-to-t from-white via-white/95 to-white/60 dark:from-[#060f1c] dark:via-[#060f1c]/95 dark:to-[#060f1c]/60 p-4 pt-8">
        <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#0c1a30] border border-gray-200 dark:border-gray-800 shadow-2xl p-6 sm:p-7 text-center transform transition-all">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1448d8] dark:text-blue-400 mb-4 ring-8 ring-blue-50/50 dark:ring-blue-950/30">
            <Lock className="w-6 h-6 text-[#1448d8] dark:text-blue-400" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {defaultTitle}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {defaultSubtitle}
          </p>

          {totalItemsCount !== undefined && totalItemsCount > 0 && (
            <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              <Sparkles className="w-3.5 h-3.5 text-[#1448d8]" />
              <span>
                {previewCount !== undefined ? `Showing ${previewCount} of ${totalItemsCount} items` : `${totalItemsCount} total items`}
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href={loginHref}
              onClick={handleCtaClick}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#1448d8] hover:bg-[#0f3bb8] text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.98] min-h-[44px]"
            >
              <span>Sign In to Unlock Free Access</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href={`/register?callbackUrl=${encodeURIComponent(returnUrl || pathname)}`}
              onClick={handleCtaClick}
              className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <span>Don't have an account? Sign up free</span>
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Instant Free Access
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1448d8]" />
              No Credit Card Required
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
