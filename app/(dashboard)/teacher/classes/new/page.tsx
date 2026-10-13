"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { istToUtcIso, isIstDateTimeInFuture, formatUtcToIst } from "@/lib/demo/slot-utils"

interface CourseOption {
  id: string
  title: string
}

export default function ScheduleClassPage() {
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [courseId, setCourseId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("60")

  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successDetails, setSuccessDetails] = useState<any | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let isMounted = true
    fetch("/api/teacher/courses")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load courses (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (isMounted && Array.isArray(data.courses)) {
          setCourses(data.courses)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch published courses:", err)
      })
      .finally(() => {
        if (isMounted) setLoadingCourses(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs: Record<string, string> = {}

    if (!topic.trim()) {
      errs.topic = "Class topic is required."
    }
    if (!courseId) {
      errs.courseId = "Please select a course."
    }
    if (!date) {
      errs.date = "Date is required."
    }
    if (!time) {
      errs.time = "Start time is required."
    }

    if (date && time) {
      if (!isIstDateTimeInFuture(date, time)) {
        errs.time = "Start time must be in the future."
      }
    }

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs)
      setError(Object.values(errs)[0])
      return
    }

    setValidationErrors({})
    setIsSubmitting(true)

    try {
      const startTimeUtc = istToUtcIso(date, time)
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          courseId,
          startTimeUtc,
          durationMinutes: Number(duration),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const errorMsg = data?.error || `Failed to schedule class (Status ${res.status})`
        setError(errorMsg)
        return
      }

      setSuccessDetails(data)
      setIsSuccess(true)
    } catch (err: any) {
      console.error("Error scheduling class:", err)
      setError(err?.message || "Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const courseSlug = successDetails?.slot?.course?.slug
  const slotId = successDetails?.slot?.id
  const studentJoinUrl = typeof window !== "undefined" && courseSlug && slotId
    ? `${window.location.origin}/courses/${courseSlug}/demo?slot=${slotId}`
    : `/courses/${courseSlug || "course"}/demo?slot=${slotId || ""}`

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      window.prompt("Copy student join link:", text)
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
          <span className="px-3 py-1 rounded-full bg-[#1448d8]/10 text-[#1448d8] text-xs font-bold">
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
          <div role="status" className="py-6 space-y-5 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">
                {successDetails?.slot?.topic || topic}
              </h3>
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                {successDetails?.slot?.startTime
                  ? formatUtcToIst(successDetails.slot.startTime).fullLabel
                  : "Scheduled in IST"}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Class scheduled successfully!
              </p>
            </div>

            {/* Student Join Link Card */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left space-y-3">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block uppercase tracking-wider">
                Student Join URL:
              </span>
              <div className="flex items-center gap-2 bg-white dark:bg-black p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono">
                <span className="truncate flex-1 text-gray-900 dark:text-gray-100 select-all">
                  {studentJoinUrl}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(studentJoinUrl)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
                >
                  {copiedLink ? "Copied" : "Copy link"}
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                Share this direct live demo link with your learners or across marketing channels.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/teacher/classes"
                className="flex-1 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs transition-colors text-center"
              >
                Go to My Classes
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false)
                  setSuccessDetails(null)
                  setTopic("")
                  setCourseId("")
                  setDate("")
                  setTime("")
                  setDuration("60")
                }}
                className="flex-1 py-3 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white font-bold text-xs transition-colors text-center cursor-pointer"
              >
                Schedule another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="topic" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Class Topic / Lecture Title <span className="text-red-500">*</span>
              </label>
              <input
                id="topic"
                name="topic"
                type="text"
                placeholder="e.g. Electric Charges, Coulomb's Law & Field Lines"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value)
                  if (validationErrors.topic) {
                    setValidationErrors((prev) => {
                      const next = { ...prev }
                      delete next.topic
                      return next
                    })
                  }
                }}
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8] ${
                  validationErrors.topic ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                }`}
              />
              {validationErrors.topic && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.topic}</p>
              )}
            </div>

            <div>
              <label htmlFor="courseId" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Target Course <span className="text-red-500">*</span>
              </label>
              <select
                id="courseId"
                name="courseId"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value)
                  if (validationErrors.courseId) {
                    setValidationErrors((prev) => {
                      const next = { ...prev }
                      delete next.courseId
                      return next
                    })
                  }
                }}
                disabled={loadingCourses}
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1448d8] disabled:opacity-60 ${
                  validationErrors.courseId ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                }`}
              >
                <option value="">
                  {loadingCourses ? "Loading published courses..." : "Select a published course..."}
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {validationErrors.courseId && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.courseId}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Date (IST) <span className="text-red-500">*</span>
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    if (validationErrors.date) {
                      setValidationErrors((prev) => {
                        const next = { ...prev }
                        delete next.date
                        return next
                      })
                    }
                  }}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1448d8] ${
                    validationErrors.date ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                  }`}
                />
                {validationErrors.date && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.date}</p>
                )}
              </div>

              <div>
                <label htmlFor="time" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Start Time (IST) <span className="text-red-500">*</span>
                </label>
                <input
                  id="time"
                  name="time"
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value)
                    if (validationErrors.time) {
                      setValidationErrors((prev) => {
                        const next = { ...prev }
                        delete next.time
                        return next
                      })
                    }
                  }}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1448d8] ${
                    validationErrors.time ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                  }`}
                />
                {validationErrors.time && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.time}</p>
                )}
              </div>


              <div>
                <label htmlFor="duration" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Duration (Mins)
                </label>
                <select
                  id="duration"
                  name="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1448d8]"
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
                className="px-6 py-2.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold shadow-md shadow-[#1448d8]/20 flex items-center gap-2 transition-colors disabled:opacity-50"
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
