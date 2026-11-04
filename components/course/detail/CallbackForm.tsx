"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, PhoneCall, AlertCircle } from "lucide-react"

interface CallbackFormProps {
  courseIdOrSlug: string
  source?: string
}

const initialForm = { name: "", mobile: "", note: "", website: "" }

/**
 * "Request a call back" form. Stores the lead in our DB only (no SMS).
 * Honeypot field `website` is visually hidden and must stay empty.
 */
export function CallbackForm({ courseIdOrSlug, source = "COURSE_DETAIL" }: CallbackFormProps) {
  const [form, setForm] = useState(initialForm)
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (state === "loading") return
    setState("loading")
    setMessage("")
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseIdOrSlug)}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source }),
      })
      if (!res.ok) throw new Error("Could not submit right now")
      setState("success")
      setMessage("Thanks — our team will call you shortly.")
      setForm(initialForm)
    } catch (error: any) {
      setState("error")
      setMessage(error?.message || "Something went wrong. Please try again.")
    }
  }

  if (state === "success") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-emerald-900">Request received</p>
          <p className="text-xs text-emerald-800">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <PhoneCall className="h-4 w-4 text-[color:var(--cd-olive)]" aria-hidden="true" />
        <h3 className="text-sm font-extrabold text-gray-900">Request a call back</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="callback-name" className="mb-1 block text-xs font-bold text-gray-700">
            Your name
          </label>
          <input
            id="callback-name"
            required
            minLength={2}
            maxLength={80}
            value={form.name}
            onChange={update("name")}
            className="min-h-[44px] w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[color:var(--cd-olive)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cd-olive)]/30"
            placeholder="Full name"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="callback-mobile" className="mb-1 block text-xs font-bold text-gray-700">
            Mobile number
          </label>
          <input
            id="callback-mobile"
            required
            inputMode="tel"
            autoComplete="tel"
            value={form.mobile}
            onChange={update("mobile")}
            className="min-h-[44px] w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[color:var(--cd-olive)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cd-olive)]/30"
            placeholder="10-digit mobile"
          />
        </div>
      </div>

      <div>
        <label htmlFor="callback-note" className="mb-1 block text-xs font-bold text-gray-700">
          What do you want to discuss? (optional)
        </label>
        <textarea
          id="callback-note"
          rows={2}
          maxLength={500}
          value={form.note}
          onChange={update("note")}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[color:var(--cd-olive)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cd-olive)]/30"
          placeholder="Batch timings, fees, syllabus…"
        />
      </div>

      {/* Honeypot: hidden from users and assistive tech. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="callback-website">Website</label>
        <input id="callback-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update("website")} />
      </div>

      {state === "error" && (
        <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" aria-hidden="true" /> {message}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--cd-olive)] px-4 py-3 text-sm font-extrabold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PhoneCall className="h-4 w-4" aria-hidden="true" />}
        {state === "loading" ? "Sending…" : "Request call back"}
      </button>

      <p className="text-[11px] text-gray-500">
        We will only use this number to call you about this course. No SMS or marketing spam.
      </p>
    </form>
  )
}
