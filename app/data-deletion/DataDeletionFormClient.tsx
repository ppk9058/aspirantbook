"use client"

import React, { useState, useTransition } from "react"
import { submitDataDeletionRequest } from "@/lib/actions/legal"
import { Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export function DataDeletionFormClient() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const res = await submitDataDeletionRequest(null, formData)
      setResult(res)
      if (res.success) {
        ;(event.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result?.success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p>{result.message}</p>
        </div>
      )}

      {result?.error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p>{result.error}</p>
        </div>
      )}

      <div>
        <label htmlFor="del-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Registered Account Email Address <span className="text-rose-500">*</span>
        </label>
        <input
          id="del-email"
          name="email"
          type="email"
          required
          placeholder="your-account@example.com"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
        />
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Must match the email address associated with your AspirantBook web or mobile account.
        </p>
      </div>

      <div>
        <label htmlFor="del-reason" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Reason for Deletion (Optional)
        </label>
        <textarea
          id="del-reason"
          name="reason"
          rows={3}
          placeholder="e.g. Cleared my competitive examination, no longer preparing, or privacy preference"
          className="w-full min-h-[80px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
        />
      </div>

      <div>
        <label htmlFor="del-confirm" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Type <span className="font-mono text-rose-600 dark:text-rose-400 font-black">DELETE</span> to confirm <span className="text-rose-500">*</span>
        </label>
        <input
          id="del-confirm"
          name="confirmText"
          type="text"
          required
          placeholder="DELETE"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono font-bold"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px] px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Submitting Deletion Request...</span>
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4" />
            <span>Submit Account Deletion Request</span>
          </>
        )}
      </button>
    </form>
  )
}
