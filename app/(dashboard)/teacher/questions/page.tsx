"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  HelpCircle,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  ExternalLink,
  ArrowLeft,
  X,
  Loader2,
  Sparkles,
  Search,
} from "lucide-react"
import Image from "next/image"
import { buildPdfReaderHref } from "@/lib/pdf/reader-href"

interface Doubt {
  id: string
  studentId: string
  studentName: string
  studentEmail?: string
  subject: string
  topic?: string
  questionText: string
  attachment?: {
    name: string
    url: string
    type: "image" | "pdf"
    size?: string
  }
  status: "PENDING" | "ANSWERED"
  teacherAnswer?: string
  teacherName?: string
  answeredAt?: string
  createdAt: string
  upvotes?: number
}

export default function TeacherQuestionsPage() {
  const [doubts, setDoubts] = useState<Doubt[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "ANSWERED">("PENDING")
  const [searchQuery, setSearchQuery] = useState("")

  // Answering modal state
  const [activeDoubt, setActiveDoubt] = useState<Doubt | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const fetchDoubts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/doubts")
      const data = await res.json()
      if (data.doubts) {
        setDoubts(data.doubts)
      }
    } catch (err) {
      console.error("Failed to load doubts:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoubts()
  }, [])

  const handleOpenAnswerModal = (doubt: Doubt) => {
    setActiveDoubt(doubt)
    setAnswerText(doubt.teacherAnswer || "")
  }

  const handleCloseAnswerModal = () => {
    setActiveDoubt(null)
    setAnswerText("")
  }

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeDoubt || !answerText.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/doubts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeDoubt.id,
          action: "answer",
          answerText: answerText.trim(),
        }),
      })

      if (res.ok) {
        await fetchDoubts()
        handleCloseAnswerModal()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to submit answer.")
      }
    } catch (err) {
      console.error("Failed to submit answer:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = doubts.filter((d) => {
    if (filterTab === "PENDING" && d.status !== "PENDING") return false
    if (filterTab === "ANSWERED" && d.status !== "ANSWERED") return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        d.questionText.toLowerCase().includes(q) ||
        d.studentName.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        (d.topic && d.topic.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Teacher Dashboard</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            Student Doubts & Questions Queue
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold">
              {doubts.filter((d) => d.status === "PENDING").length} Pending
            </span>
          </h1>
          <p className="text-xs text-gray-500">
            Review submitted questions, inspect diagrams/code, and provide verified answers.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterTab("PENDING")}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterTab === "PENDING"
                ? "bg-white dark:bg-[#05192D] text-amber-500 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Needs Answer ({doubts.filter((d) => d.status === "PENDING").length})
          </button>
          <button
            onClick={() => setFilterTab("ANSWERED")}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterTab === "ANSWERED"
                ? "bg-white dark:bg-[#05192D] text-emerald-500 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Answered ({doubts.filter((d) => d.status === "ANSWERED").length})
          </button>
          <button
            onClick={() => setFilterTab("ALL")}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterTab === "ALL"
                ? "bg-white dark:bg-[#05192D] text-[#1448d8] shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            All Questions ({doubts.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or concept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8]"
          />
        </div>
      </div>

      {/* Doubts Feed */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading student doubts...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">No questions in this filter</h3>
          <p className="text-xs text-gray-400 mt-1">All caught up! Excellent job keeping your students unblocked.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((doubt) => (
            <div
              key={doubt.id}
              className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-3"
            >
              {/* Question metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#1448d8]/10 text-[#1448d8] text-[11px] font-bold">
                    {doubt.subject}
                  </span>
                  {doubt.topic && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-medium">
                      {doubt.topic}
                    </span>
                  )}
                </div>

                {doubt.status === "PENDING" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    Awaiting Answer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Answered by {doubt.teacherName}
                  </span>
                )}
              </div>

              {/* Student info and question text */}
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Asked by <strong className="text-gray-800 dark:text-gray-200">{doubt.studentName}</strong> &bull;{" "}
                  {new Date(doubt.createdAt).toLocaleString()}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-pre-line leading-relaxed">
                  {doubt.questionText}
                </p>
              </div>

              {/* Attachment Preview (if any) */}
              {doubt.attachment && (
                <div className="pt-1">
                  {doubt.attachment.type === "image" ? (
                    <div
                      className="inline-block relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 group cursor-pointer"
                      onClick={() => setPreviewImage(doubt.attachment!.url)}
                    >
                      <Image
                        src={doubt.attachment.url}
                        alt="attachment preview"
                        width={800}
                        height={600}
                        className="max-h-40 max-w-xs rounded-xl bg-gray-50 object-contain dark:bg-gray-900"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                        Zoom Attachment
                      </div>
                    </div>
                  ) : doubt.attachment.type === "pdf" ? (
                    <Link
                      href={buildPdfReaderHref({
                        src: doubt.attachment.url,
                        downloadUrl: doubt.attachment.url,
                        title: doubt.attachment.name || "Doubt Attachment",
                        subtitle: `Doubt • ${doubt.subject} (${doubt.studentName})`,
                        badge: "Doubt Attachment",
                      })}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-[#1448d8]"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>{doubt.attachment.name}</span>
                    </Link>
                  ) : (
                    <a
                      href={doubt.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-[#1448d8]"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>{doubt.attachment.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 ml-1" />
                    </a>
                  )}
                </div>
              )}

              {/* Answer if exists */}
              {doubt.status === "ANSWERED" && doubt.teacherAnswer && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-900/40 text-xs text-gray-800 dark:text-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      Your Official Faculty Answer:
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {doubt.answeredAt && new Date(doubt.answeredAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed">{doubt.teacherAnswer}</p>
                </div>
              )}

              {/* Answer CTA */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  onClick={() => handleOpenAnswerModal(doubt)}
                  className="px-4 py-2 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{doubt.status === "ANSWERED" ? "Edit Answer" : "Write Official Answer"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Answer Modal */}
      {activeDoubt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0a2540]/40">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  Answer Student Doubt
                </h3>
                <p className="text-xs text-gray-500">
                  Student: {activeDoubt.studentName} &bull; {activeDoubt.subject}
                </p>
              </div>
              <button
                onClick={handleCloseAnswerModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAnswer} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-400 font-semibold mb-1">Student Question:</p>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line">
                  {activeDoubt.questionText}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Your Answer & Step-by-Step Explanation
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Provide a clear, pedagogical explanation with formulas, code snippets, or rationale..."
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleCloseAnswerModal}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !answerText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold shadow-md shadow-[#1448d8]/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Publish Answer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Zoom Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Image
              src={previewImage}
              alt="Attachment zoom"
              width={1200}
              height={900}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
