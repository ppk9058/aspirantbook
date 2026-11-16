"use client"

import { useState } from "react"
import { Share2, Printer, Check } from "lucide-react"

/**
 * Share + Download-Solution-PDF actions for a public question page.
 * "Download Solution PDF" uses the browser print dialog (print stylesheet
 * renders question + solution only). Every action has a visible result.
 */
export function QuestionActions() {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={share}
        aria-label={error ? "Copy failed, try again" : copied ? "Link copied" : "Share this question"}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{error ? "Copy failed" : copied ? "Copied" : "Share"}</span>
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer"
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
        <span>Download Solution PDF</span>
      </button>
    </div>
  )
}
