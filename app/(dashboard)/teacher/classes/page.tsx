"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calendar,
  Radio,
  PlusCircle,
  Users,
  Clock,
  ArrowLeft,
  Video,
  Edit2,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from "lucide-react"

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Copy state per class id
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Cancel dialog state
  const [classToCancel, setClassToCancel] = useState<any | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const fetchClasses = () => {
    setLoading(true)
    setError(null)
    fetch("/api/teacher/classes")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || `Failed to fetch classes (${res.status})`)
        }
        return data
      })
      .then((data) => {
        if (data.classes) {
          setClasses(data.classes)
        }
      })
      .catch((err) => {
        console.error("Error fetching classes:", err)
        setError(err?.message || "Failed to load classes.")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  const handleCopyLink = async (cls: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const fullUrl = `${origin}${cls.demoLink}`
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = fullUrl
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopiedId(cls.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      window.prompt("Copy class join link:", fullUrl)
    }
  }

  const handleConfirmCancel = async () => {
    if (!classToCancel) return
    setIsCancelling(true)
    setCancelError(null)

    try {
      const res = await fetch(`/api/teacher/classes/${classToCancel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const errText = data?.error || `Failed to cancel class (Status ${res.status})`
        setCancelError(errText)
        return
      }

      setClasses((prev) => prev.filter((c) => c.id !== classToCancel.id))
      setSuccessMsg(`Class "${classToCancel.title}" was cancelled successfully.`)
      setTimeout(() => setSuccessMsg(null), 5000)
      setClassToCancel(null)
    } catch (err: any) {
      console.error("Error cancelling class:", err)
      setCancelError(err?.message || "Network error. Please try again.")
    } finally {
      setIsCancelling(false)
    }
  }

  const [activeTab, setActiveTab] = useState<"upcoming" | "live" | "past" | "cancelled">("upcoming")

  const upcomingClasses = classes.filter((c) => c.rawStatus === "SCHEDULED" || (!c.rawStatus && c.status === "SCHEDULED"))
  const liveClasses = classes.filter((c) => c.rawStatus === "LIVE" || c.status === "LIVE NOW")
  const pastClasses = classes.filter((c) => c.rawStatus === "ENDED" || c.status === "ENDED")
  const cancelledClasses = classes.filter((c) => c.rawStatus === "CANCELLED" || c.status === "CANCELLED")

  const currentTabClasses =
    activeTab === "upcoming"
      ? upcomingClasses
      : activeTab === "live"
      ? liveClasses
      : activeTab === "past"
      ? pastClasses
      : cancelledClasses

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Teacher Dashboard</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            My Teaching Classes & Broadcasts
          </h1>
          <p className="text-xs text-gray-500">
            View upcoming sessions, start broadcasts, and schedule new lectures.
          </p>
        </div>

        <Link
          href="/teacher/classes/new"
          className="px-5 py-2.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold shadow-md shadow-[#1448d8]/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Schedule New Class</span>
        </Link>
      </div>

      {successMsg && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          data-testid="tab-upcoming"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-[#1448d8] text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <span>Upcoming</span>
          <span
            data-testid="count-upcoming"
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "upcoming"
                ? "bg-white/20 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            {upcomingClasses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("live")}
          data-testid="tab-live"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "live"
              ? "bg-red-500 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            <span>Live</span>
          </span>
          <span
            data-testid="count-live"
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "live"
                ? "bg-white/20 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            {liveClasses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("past")}
          data-testid="tab-past"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "past"
              ? "bg-[#1448d8] text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <span>Past</span>
          <span
            data-testid="count-past"
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "past"
                ? "bg-white/20 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            {pastClasses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cancelled")}
          data-testid="tab-cancelled"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "cancelled"
              ? "bg-gray-700 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <span>Cancelled</span>
          <span
            data-testid="count-cancelled"
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "cancelled"
                ? "bg-white/20 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            {cancelledClasses.length}
          </span>
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1448d8]" />
            Loading scheduled classes...
          </div>
        ) : currentTabClasses.length === 0 ? (
          <div
            data-testid={`empty-state-${activeTab}`}
            className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500"
          >
            <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {activeTab === "upcoming" && "No upcoming scheduled classes"}
              {activeTab === "live" && "No classes currently live"}
              {activeTab === "past" && "No past classes found"}
              {activeTab === "cancelled" && "No cancelled classes found"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === "upcoming" && 'Click "Schedule New Class" to create a new live broadcast.'}
              {activeTab === "live" && "Classes currently broadcasting will appear here."}
              {activeTab === "past" && "Completed sessions and past lectures will appear here."}
              {activeTab === "cancelled" && "Cancelled classes are archived here for your records."}
            </p>
          </div>
        ) : (
          currentTabClasses.map((cls) => {
            const isLive = cls.rawStatus === "LIVE" || cls.status === "LIVE NOW"
            const isPast = cls.rawStatus === "ENDED" || cls.status === "ENDED"
            const isCancelled = cls.rawStatus === "CANCELLED" || cls.status === "CANCELLED"
            const isReadOnly = isPast || isCancelled

            return (
              <div
                key={cls.id}
                data-testid={`class-card-${cls.id}`}
                className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isLive && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-500 text-[11px] font-bold animate-pulse">
                        <Radio className="w-3 h-3" />
                        LIVE NOW
                      </span>
                    )}
                    {isPast && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-500/15 text-gray-600 dark:text-gray-400 text-[11px] font-semibold">
                        <Check className="w-3 h-3 text-emerald-500" />
                        Completed
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        Cancelled
                      </span>
                    )}
                    {!isLive && !isPast && !isCancelled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 text-[11px] font-semibold">
                        <Clock className="w-3 h-3" />
                        Scheduled
                      </span>
                    )}
                    <span className="text-xs font-semibold text-gray-500">{cls.batch}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {cls.durationMinutes && <span>{cls.durationMinutes} mins</span>}
                    <span>{cls.time}</span>
                  </div>
                </div>

                <h3 className="font-bold text-base text-gray-900 dark:text-white">{cls.title}</h3>

                {/* Additional timestamps for past classes */}
                {isPast && (cls.startedAt || cls.endedAt) && (
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    {cls.startedAt && (
                      <span>
                        <strong className="text-gray-700 dark:text-gray-300">Started:</strong>{" "}
                        {new Date(cls.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {cls.endedAt && (
                      <span>
                        <strong className="text-gray-700 dark:text-gray-300">Ended:</strong>{" "}
                        {new Date(cls.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span data-testid={`booking-count-${cls.id}`}>
                      {cls.bookingsCount ?? cls.studentsCount} Students registered
                    </span>
                  </span>

                  {!isReadOnly && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Copy Link */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(cls)}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedId === cls.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      {/* Edit */}
                      {isLive ? (
                        <button
                          type="button"
                          disabled
                          title="LIVE NOW classes cannot be edited"
                          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 text-xs font-semibold flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <Link
                          href={`/teacher/classes/${cls.id}/edit`}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Link>
                      )}

                      {/* Cancel */}
                      {isLive ? (
                        <button
                          type="button"
                          disabled
                          title="LIVE NOW classes cannot be cancelled"
                          className="px-3 py-1.5 rounded-xl border border-red-200/50 dark:border-red-900/50 text-red-300 dark:text-red-800 text-xs font-semibold flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelError(null)
                            setClassToCancel(cls)
                          }}
                          className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}

                      {/* Join Live Demo */}
                      <Link
                        href={cls.demoLink || "/teacher/classes"}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Live Demo</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {classToCancel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="cancel-dialog-title" className="font-bold text-base text-gray-900 dark:text-white">
                  Cancel Scheduled Class?
                </h3>
                <p className="text-xs text-gray-500">
                  This action will soft-cancel the session and hide it from upcoming lists.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200">
              {classToCancel.title}
            </div>

            {/* Warning if bookings exist */}
            {classToCancel.studentsCount > 0 && (
              <div
                data-testid="cancel-booking-warning"
                className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium space-y-1"
              >
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Warning: Registered Students Affected</span>
                </div>
                <p>
                  This class has <strong className="font-bold">{classToCancel.studentsCount}</strong> registered student{classToCancel.studentsCount > 1 ? "s" : ""}. Cancelling will notify learners that the session is cancelled.
                </p>
              </div>
            )}

            {cancelError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold"
              >
                {cancelError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setClassToCancel(null)}
                disabled={isCancelling}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Keep Class
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Cancellation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
