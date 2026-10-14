"use client"

import React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { Play, RotateCcw, FileText, ArrowRight } from "lucide-react"
import { sanitizeReturnPath } from "@/lib/utils/return-path"
import { getExamInstructionsUrl, getExamAttemptUrl, getExamResultUrl } from "@/lib/exam/urls"
import { fetchBatchedUserStatus } from "@/lib/exam/batched-user-status"

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
  isFreeSample?: boolean
  customStartUrl?: string
  isGuest?: boolean
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
  isFreeSample = false,
  customStartUrl,
  isGuest,
}: TestActionButtonProps) {
  const { data: session, status: authStatus } = useSession()
  const { openMobileAuth } = useMobileAuth()
  const [internalStatus, setInternalStatus] = React.useState<any>(initialStatus || null)
  const [isLoading, setIsLoading] = React.useState(initialLoading || (!initialStatus && !disabled))

  const isActuallyGuest = isGuest !== undefined ? isGuest : (!session?.user && authStatus !== "loading")

  const handleGuestClick = (e: React.MouseEvent, targetUrl: string) => {
    if (isActuallyGuest) {
      e.preventDefault()
      openMobileAuth({
        actionType: "login",
        callbackUrl: targetUrl,
      })
    }
  }

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

    fetchBatchedUserStatus(testId)
      .then((status) => {
        if (!isMounted) return
        setInternalStatus(status || { state: "NOT_STARTED" })
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
    const resumeUrl = getExamAttemptUrl({
      seriesId,
      testId,
      attemptId: status.inProgressAttemptId,
      title: testTitle,
      returnPath,
    })

    return (
      <Link
        href={resumeUrl}
        onClick={(e) => handleGuestClick(e, resumeUrl)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-xs transition-colors ${sizeClasses} ${className}`}
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Continue</span>
      </Link>
    )
  }

  // 2. SUBMITTED state -> "Full Report" + optional "Retake"
  if (status?.state === "SUBMITTED" && status.latestSubmittedAttemptId) {
    const reportUrl = getExamResultUrl({
      seriesId,
      testId,
      attemptId: status.latestSubmittedAttemptId,
      title: testTitle,
      returnPath,
    })
    const retakeUrl = getExamInstructionsUrl({
      seriesId,
      testId,
      title: testTitle,
      returnPath,
    })

    return (
      <div className="inline-flex items-center gap-2">
        <Link
          href={reportUrl}
          onClick={(e) => handleGuestClick(e, reportUrl)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-extrabold shadow-xs transition-colors ${sizeClasses} ${className}`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Full Report</span>
        </Link>

        {showRetake && (
          <Link
            href={retakeUrl}
            onClick={(e) => handleGuestClick(e, retakeUrl)}
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
  const startUrl =
    customStartUrl ||
    getExamInstructionsUrl({
      seriesId,
      testId,
      title: testTitle,
      returnPath,
    })
  return (
    <Link
      href={startUrl}
      onClick={(e) => handleGuestClick(e, startUrl)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors ${sizeClasses} ${className}`}
    >
      <Play className="w-3.5 h-3.5 fill-current" />
      <span>{isFreeSample ? "Start Free Sample" : "Start Now"}</span>
    </Link>
  )
}
