"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  Download,
  ShieldCheck,
  Lock,
  ShieldAlert,
  FileX,
  AlertCircle,
  RotateCw,
  Loader2,
  ExternalLink,
} from "lucide-react"
import {
  PdfProbeStatus,
  getPdfErrorDetails,
  probePdfAccess,
  shouldShowDownloadButton,
} from "@/lib/pdf/pdf-viewer-state"
import { buildPassLoginHref } from "@/lib/pyqs/pass-popup"

export interface PdfReaderFrameProps {
  src: string
  downloadUrl?: string
  title?: string
  subtitle?: string
  badgeLabel?: string
  fallbackBackUrl?: string
  custom403Message?: string
  customErrorMessage?: string
  testId?: string
}

export function PdfReaderFrame({
  src,
  downloadUrl,
  title = "PDF Document",
  subtitle,
  badgeLabel = "Verified Document",
  fallbackBackUrl = "/",
  custom403Message,
  customErrorMessage,
  testId = "pdf-reader-page",
}: PdfReaderFrameProps) {
  const router = useRouter()
  const [probeStatus, setProbeStatus] = useState<PdfProbeStatus>("loading")
  const [retryCount, setRetryCount] = useState(0)

  // One-shot probe before rendering iframe
  useEffect(() => {
    if (!src) {
      setProbeStatus("not_found")
      return
    }

    let isMounted = true
    setProbeStatus("loading")

    probePdfAccess(src)
      .then((status) => {
        if (isMounted) {
          setProbeStatus(status)
        }
      })
      .catch(() => {
        if (isMounted) {
          setProbeStatus("error")
        }
      })

    return () => {
      isMounted = false
    }
  }, [src, retryCount])

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackBackUrl)
    }
  }

  const canDownload = shouldShowDownloadButton({
    downloadAllowed: true,
    downloadUrl,
    probeStatus,
  })

  const errorDetails = getPdfErrorDetails(probeStatus, {
    src,
    custom403Message,
    customErrorMessage,
  })

  const currentPath =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : fallbackBackUrl

  return (
    <div
      data-testid={testId}
      className="flex flex-col h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-2.5rem)] pb-[env(safe-area-inset-bottom,0px)] w-full max-w-full bg-white dark:bg-slate-900 overflow-x-hidden overflow-y-hidden"
    >
      {/* Slim Top Header Bar */}
      <header className="flex items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50/90 dark:bg-slate-900/90 shrink-0 gap-2 min-w-0 max-w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-1 flex-1">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-xs sm:text-sm text-gray-950 dark:text-white truncate block">
              {title}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
              {subtitle && <span className="truncate">{subtitle}</span>}
              {subtitle && <span>&bull;</span>}
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{badgeLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile direct link for phone browsers where iframe rendering might be limited */}
          {probeStatus === "ready" && src && (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 transition-colors shadow-2xs min-h-[36px]"
              aria-label="Open full PDF in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Open full PDF</span>
            </a>
          )}

          {canDownload && downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-2xs shrink-0 min-h-[36px] sm:min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </a>
          )}
        </div>
      </header>

      {/* Reader Viewport / Error State */}
      <div className="flex-1 w-full bg-gray-100 dark:bg-slate-950 relative overflow-hidden">
        {probeStatus === "loading" && (
          <div
            data-testid="pdf-loading-state"
            className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 dark:text-gray-400"
          >
            <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
            <p className="text-sm font-semibold">Loading document…</p>
          </div>
        )}

        {errorDetails && (
          <div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
            data-testid={`pdf-error-${probeStatus}`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                probeStatus === "unauthenticated"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                  : probeStatus === "unauthorized" || probeStatus === "error"
                  ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              {probeStatus === "unauthenticated" && <Lock className="w-7 h-7" />}
              {probeStatus === "unauthorized" && <ShieldAlert className="w-7 h-7" />}
              {probeStatus === "not_found" && <FileX className="w-7 h-7" />}
              {probeStatus === "error" && <AlertCircle className="w-7 h-7" />}
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
              {errorDetails.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
              {errorDetails.description}
            </p>

            <div className="flex items-center gap-3">
              {probeStatus === "unauthenticated" ? (
                <Link
                  href={buildPassLoginHref(currentPath)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white transition-colors shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Go Back</span>
                </button>
              )}

              {errorDetails.action === "retry" && (
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>
        )}

        {probeStatus === "ready" && (
          <iframe
            src={src}
            className="w-full h-full border-0"
            title={`PDF Reader: ${title}`}
          />
        )}
      </div>
    </div>
  )
}
