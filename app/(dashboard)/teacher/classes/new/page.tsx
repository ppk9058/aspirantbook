"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react"

export default function ScheduleClassPage() {
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [batch, setBatch] = useState("Champs 2.0 (Class 6)")
  const [subject, setSubject] = useState("Science & Physics")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("60")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successDetails, setSuccessDetails] = useState<any | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, batch, subject, date, time, duration }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessDetails(data)
        setIsSuccess(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Classes</span>
      </Link>

      <div className="bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-[#3AAFA9]/10 text-[#3AAFA9] text-xs font-bold">
            Live Classroom Schedule
          </span>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            Schedule a New Teaching Session
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Enrolled students will receive automated calendar notifications and dashboard reminders.
          </p>
        </div>

        {isSuccess ? (
          <div className="py-6 space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                Lecture & Demo Slot Scheduled!
              </h3>
              <p className="text-xs text-gray-500">
                This session has been added to your classes and synced to the course demo slots.
              </p>
            </div>

            {/* Campaign Links Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left space-y-3">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block uppercase tracking-wider">
                Facebook & Social Media Ad Campaign URL:
              </span>
              <div className="flex items-center gap-2 bg-white dark:bg-black p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono">
                <span className="truncate flex-1 text-gray-900 dark:text-gray-100">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}${successDetails?.directDemoLink ? successDetails.directDemoLink.replace('/demo', '') : '/courses/72nd-bpsc-prelims-current-affairs'}`
                    : "https://trillionskill.com/courses/72nd-bpsc-prelims-current-affairs"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      const url = `${window.location.origin}${successDetails?.directDemoLink ? successDetails.directDemoLink.replace('/demo', '') : '/courses/72nd-bpsc-prelims-current-affairs'}`
                      navigator.clipboard.writeText(url)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  {copiedLink ? "Copied ✓" : "Copy Link"}
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                Put this link in your Facebook/Instagram ads. When students click, they arrive on the course page where they can pick this slot and register their mobile number.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/teacher/classes"
                className="flex-1 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs transition-colors text-center"
              >
                Go to My Classes List
              </Link>
              <Link
                href={successDetails?.directDemoLink || "/courses/72nd-bpsc-prelims-current-affairs/demo"}
                className="flex-1 py-3 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white font-bold text-xs transition-colors text-center"
              >
                Preview Live Classroom →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Class Topic / Lecture Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Electric Charges, Coulomb's Law & Field Lines"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Target Batch
                </label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                >
                  <option value="Champs 2.0 (Class 6)">Champs 2.0 (Class 6)</option>
                  <option value="Foundation Batch 2026">Foundation Batch 2026</option>
                  <option value="Full-Stack Web Engineering">Full-Stack Web Engineering</option>
                  <option value="DSA & Competitive Programming">DSA & Competitive Programming</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                >
                  <option value="Science & Physics">Science & Physics</option>
                  <option value="Python & AI">Python & AI</option>
                  <option value="Mathematics & Aptitude">Mathematics & Aptitude</option>
                  <option value="Algorithms & Data Structures">Algorithms & Data Structures</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Duration (Mins)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                >
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
              <Link
                href="/teacher/classes"
                className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold shadow-md shadow-[#3AAFA9]/20 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    Confirm Schedule
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
