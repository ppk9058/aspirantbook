"use client"

import React, { useState, useTransition } from "react"
import { submitContactForm } from "@/lib/actions/legal"
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export function ContactFormClient() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      try {
        const res = await submitContactForm(null, formData)
        setResult(res)
        if (res?.success) {
          form.reset()
        }
      } catch (err: any) {
        console.error("[ContactFormClient] Submit error:", err)
        setResult({
          success: false,
          error: err?.message || "Failed to submit message. Please try again.",
        })
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
        <label htmlFor="name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Priya Sharma"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="priya@example.com"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          placeholder="Course question, order inquiry, or technical feedback"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          placeholder="Tell us how we can help you..."
          className="w-full min-h-[100px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px] px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Sending Message...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Send Message</span>
          </>
        )}
      </button>
    </form>
  )
}
