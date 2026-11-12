"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy, Link2, MessageCircle, Send, Share2, X } from "lucide-react"

interface ShareModalProps {
  open: boolean
  onClose: () => void
  title: string
  url: string
}

/**
 * Share sheet: Web Share API when available, otherwise copy link + WhatsApp + Telegram.
 * Accessible: focus trap, ESC to close, labelled close button.
 */
export function ShareModal({ open, onClose, title, url }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [url])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab") return
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const first = panelRef.current?.querySelector<HTMLElement>("button")
    first?.focus()
  }, [open])

  if (!open) return null

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function"
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this course"
        ref={panelRef}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share this course
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {canNativeShare && (
            <button
              type="button"
              onClick={() => navigator.share({ title, url }).catch(() => {})}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" /> Share…
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" /> Telegram
          </a>
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs text-gray-600 break-all">
          <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{url}</span>
        </p>
      </div>
    </div>
  )
}
