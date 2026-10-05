"use client"

import React from "react"
import Link from "next/link"
import { Play, RotateCcw, FileText, ArrowRight } from "lucide-react"
import { sanitizeReturnPath } from "@/lib/utils/return-path"

export interface TestActionButtonProps {
  testId: string
  seriesId: string
  testTitle?: string
  status?: {
    state: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED"
    inProgressAttemptId?: string
    latestSubmittedAttemptId?: string
    attemptCount?: number
    latestScore?: number
    bestScore?: number
  }
  loading?: boolean
  disabled?: boolean
  disabledLabel?: string
  returnPath?: string
  size?: "sm" | "md" | "lg"
  className?: string
  showRetake?: boolean
  isLocked?: boolean
  onUnlockClick?: () => void
}

export function TestActionButton({
  testId,
  seriesId,
  testTitle,
  status: initialStatus,
  loading: initialLoading = false,
  disabled = false,
  disabledLabel = "Coming Soon",
  returnPath,
  size = "md",
  className = "",
  showRetake = true,
  isLocked = false,
  onUnlockClick,
}: TestActionButtonProps) {
  const [internalStatus, setInternalStatus] = React.useState<any>(initialStatus || null)
  const [isLoading, setIsLoading] = React.useState(initialLoading || (!initialStatus && !disabled))

  React.useEffect(() => {
    if (initialStatus !== undefined) {
      setInternalStatus(initialStatus)
      setIsLoading(initialLoading)
      return
    }

    if (disabled || !testId) {
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    fetch(`/api/exam/attempt/user-status?testId=${encodeURIComponent(testId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return
        if (json.success && json.data && json.data[testId]) {
          setInternalStatus(json.data[testId])
        } else {
          setInternalStatus({ state: "NOT_STARTED" })
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setInternalStatus({ state: "NOT_STARTED" })
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [testId, initialStatus, initialLoading, disabled])

  const status = initialStatus !== undefined ? initialStatus : internalStatus
  const loading = initialStatus !== undefined ? initialLoading : isLoading

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs min-h-[36px]",
    md: "px-4 py-2 text-xs font-bold min-h-[44px]",
    lg: "px-6 py-2.5 text-sm font-extrabold min-h-[48px]",
  }[size]

  if (loading) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse text-transparent select-none ${sizeClasses} ${className}`}
        aria-label="Loading test status..."
      >
        <span className="opacity-0">Loading...</span>
      </div>
    )
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold cursor-not-allowed select-none ${sizeClasses} ${className}`}
      >
        <span>{disabledLabel}</span>
      </button>
    )
  }

  if (isLocked) {
    return (
      <button
        type="button"
        onClick={onUnlockClick}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer ${sizeClasses} ${className}`}
      >
        <span>Unlock Test</span>
      </button>
    )
  }

  const queryParams = new URLSearchParams()
  queryParams.set("testId", testId)
  if (testTitle) queryParams.set("title", testTitle)
  if (returnPath) {
    const sanitized = sanitizeReturnPath(returnPath, "")
    if (sanitized) queryParams.set("returnPath", sanitized)
  }

  // 1. IN_PROGRESS state -> "Continue"
  if (status?.state === "IN_PROGRESS" && status.inProgressAttemptId) {
    const attemptQuery = new URLSearchParams(queryParams)
    attemptQuery.set("attemptId", status.inProgressAttemptId)
    const resumeUrl = `/test-series/${seriesId}/attempt?${attemptQuery.toString()}`

    return (
      <Link
        href={resumeUrl}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-xs transition-colors ${sizeClasses} ${className}`}
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Continue</span>
      </Link>
    )
  }

  // 2. SUBMITTED state -> "Full Report" + optional "Retake"
  if (status?.state === "SUBMITTED" && status.latestSubmittedAttemptId) {
    const reportQuery = new URLSearchParams(queryParams)
    reportQuery.set("attemptId", status.latestSubmittedAttemptId)
    const reportUrl = `/test-series/${seriesId}/result?${reportQuery.toString()}`
    const retakeUrl = `/test-series/${seriesId}/instructions?${queryParams.toString()}`

    return (
      <div className="inline-flex items-center gap-2">
        <Link
          href={reportUrl}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-extrabold shadow-xs transition-colors ${sizeClasses} ${className}`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Full Report</span>
        </Link>

        {showRetake && (
          <Link
            href={retakeUrl}
            title="Retake Test"
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors min-h-[44px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Retake</span>
          </Link>
        )}
      </div>
    )
  }

  // 3. Default NOT_STARTED state -> "Start Now"
  const startUrl = `/test-series/${seriesId}/instructions?${queryParams.toString()}`
  return (
    <Link
      href={startUrl}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors ${sizeClasses} ${className}`}
    >
      <Play className="w-3.5 h-3.5 fill-current" />
      <span>Start Now</span>
    </Link>
  )
}
