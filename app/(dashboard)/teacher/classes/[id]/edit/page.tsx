"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Radio,
} from "lucide-react"
import { istToUtcIso, isIstDateTimeInFuture, utcToIstDateAndTime } from "@/lib/demo/slot-utils"

interface CourseOption {
  id: string
  title: string
}

export default function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [topic, setTopic] = useState("")
  const [courseId, setCourseId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("60")
  const [status, setStatus] = useState<string>("SCHEDULED")

  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let isMounted = true

    Promise.all([
      fetch(`/api/teacher/classes/${id}`).then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || `Failed to fetch class (${res.status})`)
        }
        return data.slot
      }),
      fetch("/api/teacher/courses").then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || `Failed to fetch courses (${res.status})`)
        }
        return data.courses || []
      }),
    ])
      .then(([slot, courseList]) => {
        if (!isMounted) return
        setCourses(courseList)
        if (slot) {
          setTopic(slot.topic || "")
          setCourseId(slot.courseId || "")
          setDuration(String(slot.durationMinutes || 60))
          setStatus(slot.status)
          if (slot.startTime) {
            const { dateStr, timeStr } = utcToIstDateAndTime(slot.startTime)
            setDate(dateStr)
            setTime(timeStr)
          }
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || "Failed to load class details.")
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (status !== "SCHEDULED") {
      setError(`Cannot edit a class with status ${status}. Only SCHEDULED classes can be edited.`)
      return
    }

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
      const res = await fetch(`/api/teacher/classes/${id}`, {
        method: "PATCH",
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
        const errorMsg = data?.error || `Failed to update class (Status ${res.status})`
        setError(errorMsg)
        return
      }

      setIsSuccess(true)
    } catch (err: any) {
      console.error("Error updating class:", err)
      setError(err?.message || "Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-xs text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3AAFA9]" />
        Loading lecture details...
      </div>
    )
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
            Edit Lecture
          </span>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            Edit Teaching Session
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Update slot topic, scheduled time, or assigned course.
          </p>
        </div>

        {status === "LIVE" && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
            <Radio className="w-4 h-4 shrink-0 animate-pulse text-red-500" />
            <span>This class is currently LIVE and cannot be edited.</span>
          </div>
        )}

        {isSuccess ? (
          <div role="status" className="py-6 space-y-5 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">
                Lecture Updated Successfully!
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Changes have been saved and synced with student demo listings.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/teacher/classes"
                className="flex-1 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs transition-colors text-center"
              >
                Return to My Classes
              </Link>
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
                disabled={status !== "SCHEDULED"}
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
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] disabled:opacity-50 ${
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
                disabled={status !== "SCHEDULED"}
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
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] disabled:opacity-50 ${
                  validationErrors.courseId ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                }`}
              >
                <option value="">Select a published course...</option>
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
                  disabled={status !== "SCHEDULED"}
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
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] disabled:opacity-50 ${
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
                  disabled={status !== "SCHEDULED"}
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
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] disabled:opacity-50 ${
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
                  disabled={status !== "SCHEDULED"}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] disabled:opacity-50"
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
                disabled={isSubmitting || status !== "SCHEDULED"}
                className="px-6 py-2.5 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold shadow-md shadow-[#3AAFA9]/20 flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    Save Changes
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
