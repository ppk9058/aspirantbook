"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import {
  HelpCircle,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  ThumbsUp,
  FileText,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Filter,
} from "lucide-react"
import DoubtSubmissionModal from "@/components/student/DoubtSubmissionModal"
import { buildPdfReaderHref } from "@/lib/pdf/reader-href"
import Image from "next/image"

interface Doubt {
  id: string
  studentId: string
  studentName: string
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

export default function DoubtsPage() {
  const { data: session } = useSession()
  const { openMobileAuth } = useMobileAuth()
  const [doubts, setDoubts] = useState<Doubt[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<"ALL" | "ANSWERED" | "PENDING">("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const isGuest = !session?.user

  const handleOpenDoubtModal = () => {
    if (isGuest) {
      openMobileAuth({
        actionType: "login",
        onSuccess: () => setIsModalOpen(true),
      })
      return
    }
    setIsModalOpen(true)
  }

  const fetchDoubts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/doubts")
      const data = await res.json()
      if (data.doubts) {
        setDoubts(data.doubts)
      }
    } catch (err) {
      console.error("Failed to fetch doubts:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoubts()
  }, [])

  const handleUpvote = async (id: string) => {
    try {
      const res = await fetch("/api/doubts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "upvote" }),
      })
      if (res.ok) {
        setDoubts((prev) =>
          prev.map((d) => (d.id === id ? { ...d, upvotes: (d.upvotes || 0) + 1 } : d))
        )
      }
    } catch (err) {
      console.error("Failed to upvote:", err)
    }
  }

  const filteredDoubts = doubts.filter((d) => {
    if (filterTab === "ANSWERED" && d.status !== "ANSWERED") return false
    if (filterTab === "PENDING" && d.status !== "PENDING") return false
    if (selectedSubject !== "ALL" && d.subject !== selectedSubject) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesTopic = d.topic?.toLowerCase().includes(q)
      const matchesText = d.questionText.toLowerCase().includes(q)
      const matchesSubject = d.subject.toLowerCase().includes(q)
      return matchesTopic || matchesText || matchesSubject
    }
    return true
  })

  const allSubjects = Array.from(new Set(doubts.map((d) => d.subject)))

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#05192D] via-[#0a2540] to-[#0d2f52] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1448d8]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1448d8]/20 border border-[#1448d8]/30 text-teal-300 text-xs font-semibold mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Doubt Solving & Mentorship Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ask Any Question, Get Teacher Answers
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-xl">
              Stuck on code, mathematical formulas, or lecture concepts? Upload a screenshot or PDF and get step-by-step verified explanations from faculty.
            </p>
          </div>
          <button
            onClick={handleOpenDoubtModal}
            className="self-start md:self-auto px-6 py-3 rounded-2xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-sm font-bold shadow-lg shadow-[#1448d8]/25 flex items-center gap-2 transition-all hover:scale-102"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Ask a Doubt Now</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterTab === "ALL"
                  ? "bg-white dark:bg-[#05192D] text-[#1448d8] shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              All Doubts ({doubts.length})
            </button>
            <button
              onClick={() => setFilterTab("ANSWERED")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterTab === "ANSWERED"
                  ? "bg-white dark:bg-[#05192D] text-emerald-500 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              Resolved ({doubts.filter((d) => d.status === "ANSWERED").length})
            </button>
            <button
              onClick={() => setFilterTab("PENDING")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterTab === "PENDING"
                  ? "bg-white dark:bg-[#05192D] text-amber-500 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              Pending ({doubts.filter((d) => d.status === "PENDING").length})
            </button>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search concepts or questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8]"
            />
          </div>
        </div>

        {/* Subject pills */}
        {allSubjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-gray-500">
            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mr-1 flex-shrink-0">
              <Filter className="w-3 h-3" /> Filter by:
            </span>
            <button
              onClick={() => setSelectedSubject("ALL")}
              className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                selectedSubject === "ALL"
                  ? "bg-[#1448d8] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              All Subjects
            </button>
            {allSubjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                  selectedSubject === sub
                    ? "bg-[#1448d8] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Doubts List */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading doubt discussions...</div>
      ) : filteredDoubts.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1448d8]/10 text-[#1448d8] flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No doubts found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Have a question on your assignments or lessons? Be the first to ask!
          </p>
          <button
            onClick={handleOpenDoubtModal}
            className="mt-4 px-5 py-2.5 rounded-xl bg-[#1448d8] text-white text-xs font-semibold"
          >
            Ask a Doubt
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDoubts.map((doubt) => (
            <div
              key={doubt.id}
              className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-all space-y-4"
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#1448d8]/10 text-[#1448d8] text-[11px] font-semibold">
                    {doubt.subject}
                  </span>
                  {doubt.topic && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-medium">
                      {doubt.topic}
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                {doubt.status === "ANSWERED" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Faculty Answered
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 text-[11px] font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Teacher Review
                  </span>
                )}
              </div>

              {/* Question Body */}
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed whitespace-pre-line">
                  {doubt.questionText}
                </p>
              </div>

              {/* Attachment Preview (if any) */}
              {doubt.attachment && (
                <div className="pt-1">
                  {doubt.attachment.type === "image" ? (
                    <div className="inline-block relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 group cursor-pointer"
                         onClick={() => setPreviewImage(doubt.attachment!.url)}>
                      <Image
                        src={doubt.attachment.url}
                        alt={doubt.attachment.name}
                        width={800}
                        height={600}
                        className="max-h-48 max-w-full rounded-xl bg-gray-50 object-contain dark:bg-gray-900"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                        Click to Zoom
                      </div>
                    </div>
                  ) : doubt.attachment.type === "pdf" ? (
                    <Link
                      href={buildPdfReaderHref({
                        src: doubt.attachment.url,
                        downloadUrl: doubt.attachment.url,
                        title: doubt.attachment.name || "Doubt Attachment",
                        subtitle: `Doubt • ${doubt.subject}`,
                        badge: "Doubt Attachment",
                      })}
                      className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-[#1448d8] transition-colors"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>{doubt.attachment.name}</span>
                      <span className="text-[10px] text-gray-400">({doubt.attachment.size || "PDF"})</span>
                    </Link>
                  ) : (
                    <a
                      href={doubt.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-[#1448d8] transition-colors"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>{doubt.attachment.name}</span>
                      <span className="text-[10px] text-gray-400">({doubt.attachment.size || "File"})</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 ml-1" />
                    </a>
                  )}
                </div>
              )}

              {/* Meta & Upvote bar */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center text-[10px] font-bold">
                    {doubt.studentName.charAt(0)}
                  </div>
                  <span>Asked by <strong className="text-gray-700 dark:text-gray-300">{doubt.studentName}</strong></span>
                  <span>&bull;</span>
                  <span>{new Date(doubt.createdAt).toLocaleDateString()}</span>
                </div>

                <button
                  onClick={() => handleUpvote(doubt.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-teal-600" />
                  <span>Helpful ({doubt.upvotes || 0})</span>
                </button>
              </div>

              {/* Teacher Answer (If answered) */}
              {doubt.status === "ANSWERED" && doubt.teacherAnswer && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/40 space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        👨‍🏫
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                          {doubt.teacherName || "Faculty Instructor"}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium">
                            Official Answer
                          </span>
                        </p>
                      </div>
                    </div>
                    {doubt.answeredAt && (
                      <span className="text-[11px] text-gray-400">
                        {new Date(doubt.answeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed pl-9">
                    {doubt.teacherAnswer}
                  </p>
                </div>
              )}
            </div>
          ))}
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
              alt="Enlarged screenshot"
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

      {/* Doubt Submission Modal */}
      <DoubtSubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDoubts}
      />
    </div>
  )
}
