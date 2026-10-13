"use client"

import React, { useEffect } from "react"
import { X, Download, ShieldCheck, BookOpen, FileText } from "lucide-react"

export interface SecurePdfViewerProps {
  isOpen: boolean
  onClose: () => void
  /** Protected or stream source URL (e.g. /api/books/[id]/download?inline=1 or /api/current-affairs/file/[id] or /api/pyqs/file/[id]) */
  src?: string
  bookId?: string
  title: string
  subtitle?: string
  author?: string
  /** Download URL if download is allowed */
  downloadUrl?: string
  downloadAllowed?: boolean
  badgeLabel?: string
  className?: string
  testId?: string
}

/**
 * Universal Shared Secure PDF Viewer Modal.
 * Used by:
 * - /books (eBooks & Digital Solved Papers)
 * - /pyqs (Previous Year Papers PDF Viewer)
 * - /current-affairs-quizzes (Monthly Magazine & CA PDFs)
 *
 * NOTE: The raw cloud storage URL is never exposed to the client; all streams
 * pass through authorized server streaming endpoints with proper RBAC verification.
 */
export default function SecurePdfViewer({
  isOpen,
  onClose,
  src,
  bookId,
  title,
  subtitle,
  author,
  downloadUrl,
  downloadAllowed = true,
  badgeLabel = "Verified Document",
  className = "",
  testId = "secure-pdf-viewer-modal",
}: SecurePdfViewerProps) {
  const resolvedSrc = src || (bookId ? `/api/books/${bookId}/download?inline=1` : "")
  const resolvedDownloadUrl = downloadUrl || (bookId ? `/api/books/${bookId}/download?download=true` : undefined)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      data-testid={testId}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={`PDF Viewer: ${title}`}
    >
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="min-w-0 pr-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm sm:text-base text-gray-950 dark:text-white truncate">
                {title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {author && <span className="truncate">By {author}</span>}
                {subtitle && <span className="truncate">{subtitle}</span>}
                <span>&bull;</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {badgeLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {downloadAllowed && resolvedDownloadUrl && (
              <a
                href={resolvedDownloadUrl}
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Secure PDF Iframe Viewport */}
        <div className="flex-1 bg-gray-100 dark:bg-slate-950 relative overflow-hidden">
          <iframe
            src={resolvedSrc}
            className="w-full h-full border-0"
            title={`PDF Reader: ${title}`}
          />
        </div>
      </div>
    </div>
  )
}
