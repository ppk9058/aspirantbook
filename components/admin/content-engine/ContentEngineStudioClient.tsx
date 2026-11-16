"use client"

import React, { useState, useMemo } from "react"
import {
  FileQuestion,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  Globe,
  Tag,
  AlertCircle,
  Plus,
  X,
  Loader2,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  StudioStatusTabs,
  useStudioSelection,
  StudioBulkActionBar,
  StudioRowMenu,
  StudioDeleteImpactDialog,
} from "@/components/admin/studio"
import { toast } from "sonner"
import { AddBatchModal } from "./AddBatchModal"
import { AnswerCheckModal } from "./AnswerCheckModal"
import { ReviewModal } from "./ReviewModal"
import { HindiReviewModal } from "./HindiReviewModal"

export interface ContentEngineSolution {
  status?: string
  check?: string | null
  checkNote?: string | null
  unsure?: string | null
  warnings?: string[]
  keyPoints?: string[]
  additionalInfo?: { heading: string; points: { text: string; sub: string[] }[] }[]
  optionAnalysis?: { letter: string; verdict: string; reason: string }[]
  memoryTip?: string | null
  concepts?: string[]
}

export interface ContentEngineQuestionItem {
  id: string
  shortId: string
  textHash: string
  q: string
  options: any
  answer: string
  answerIndex?: number
  explanation?: string | null
  sub?: string | null
  top?: string | null
  exam?: string | null
  year?: string | null
  status: string
  isPublished: boolean
  publishedAt?: string | Date | null
  createdAt: string | Date
  _count?: {
    translations: number
  }
  override?: {
    id: string
    sub: string
    top: string
  } | null
  solution?: ContentEngineSolution | null
  solutionSource?: string | null
}

interface ContentEngineStudioClientProps {
  initialQuestions: ContentEngineQuestionItem[]
}

type ContentEngineTab = "ALL" | "PUBLISHED" | "DRAFT" | "NEEDS_REVIEW" | "ARCHIVED"

export function ContentEngineStudioClient({
  initialQuestions,
}: ContentEngineStudioClientProps) {
  const [questions, setQuestions] = useState<ContentEngineQuestionItem[]>(initialQuestions)
  const [activeTab, setActiveTab] = useState<ContentEngineTab>("ALL")
  const [search, setSearch] = useState("")
  const [examFilter, setExamFilter] = useState("ALL")
  const [subjectFilter, setSubjectFilter] = useState("ALL")

  // Delete impact dialog state
  const [questionToDelete, setQuestionToDelete] = useState<ContentEngineQuestionItem | null>(null)

  // Quick view / edit modal state
  const [viewingQuestion, setViewingQuestion] = useState<ContentEngineQuestionItem | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [isAnswerCheckOpen, setIsAnswerCheckOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isHindiReviewOpen, setIsHindiReviewOpen] = useState(false)
  const [newQ, setNewQ] = useState("")
  const [newOptions, setNewOptions] = useState(["", "", "", ""])
  const [newAnswer, setNewAnswer] = useState("")
  const [newSub, setNewSub] = useState("")
  const [newTop, setNewTop] = useState("")
  const [newExam, setNewExam] = useState("")
  const [newYear, setNewYear] = useState("2024")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reload questions from the API (used after batch import)
  const refetchQuestions = async () => {
    try {
      const res = await fetch("/api/admin/content-engine")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reload questions")
      setQuestions(data.data ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reload questions")
    }
  }

  // Status counts calculation
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: questions.length,
      PUBLISHED: 0,
      DRAFT: 0,
      NEEDS_REVIEW: 0,
      ARCHIVED: 0,
    }
    for (const q of questions) {
      const s = (q.status || "DRAFT").toUpperCase()
      if (s === "ARCHIVED") {
        counts.ARCHIVED++
      } else if (s === "PUBLISHED" || q.isPublished) {
        counts.PUBLISHED++
      } else if (q.solution?.status === "NEEDS_REVIEW") {
        counts.NEEDS_REVIEW++
      } else {
        counts.DRAFT++
      }
    }
    return counts
  }, [questions])

  const tabs = useMemo(
    () => [
      { id: "ALL" as const, label: "All Questions", count: statusCounts.ALL },
      { id: "PUBLISHED" as const, label: "Published", count: statusCounts.PUBLISHED },
      { id: "DRAFT" as const, label: "Drafts", count: statusCounts.DRAFT },
      { id: "NEEDS_REVIEW" as const, label: "Needs Review", count: statusCounts.NEEDS_REVIEW },
      { id: "ARCHIVED" as const, label: "Archived", count: statusCounts.ARCHIVED },
    ],
    [statusCounts]
  )

  const needsReviewQuestions = useMemo(
    () =>
      questions.filter(
        (q) =>
          (q.status || "DRAFT").toUpperCase() !== "ARCHIVED" &&
          (q.status || "DRAFT").toUpperCase() !== "PUBLISHED" &&
          q.solution?.status === "NEEDS_REVIEW",
      ),
    [questions]
  )

  // Filter options
  const uniqueExams = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.exam).filter(Boolean) as string[])).sort()
  }, [questions])

  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.sub).filter(Boolean) as string[])).sort()
  }, [questions])

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const s = (q.status || "DRAFT").toUpperCase()
      const isPub = s === "PUBLISHED" || q.isPublished

      if (activeTab === "PUBLISHED" && !isPub) return false
      if (activeTab === "DRAFT" && (isPub || s === "ARCHIVED")) return false
      if (activeTab === "NEEDS_REVIEW") {
        if (isPub || s === "ARCHIVED") return false
        if (q.solution?.status !== "NEEDS_REVIEW") return false
      }
      if (activeTab === "ARCHIVED" && s !== "ARCHIVED") return false

      if (examFilter !== "ALL" && q.exam !== examFilter) return false
      if (subjectFilter !== "ALL" && q.sub !== subjectFilter) return false

      if (search.trim()) {
        const query = search.toLowerCase()
        const matchQ = q.q.toLowerCase().includes(query)
        const matchShortId = q.shortId.toLowerCase().includes(query)
        const matchTop = q.top?.toLowerCase().includes(query)
        if (!matchQ && !matchShortId && !matchTop) return false
      }

      return true
    })
  }, [questions, activeTab, examFilter, subjectFilter, search])

  // Bulk selection hook
  const {
    selectedIds,
    selectedCount,
    allSelected,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  } = useStudioSelection({
    items: filteredQuestions,
    getItemId: (q) => q.id,
  })

  // Handle Archive / Restore toggle
  const handleToggleArchive = async (question: ContentEngineQuestionItem) => {
    const isCurrentlyArchived = question.status === "ARCHIVED"
    const nextStatus = isCurrentlyArchived ? "DRAFT" : "ARCHIVED"

    try {
      const res = await fetch(`/api/admin/content-engine/${question.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !isCurrentlyArchived }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update archive status")

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === question.id
            ? { ...q, status: nextStatus, isPublished: false }
            : q
        )
      )
      toast.success(
        isCurrentlyArchived
          ? `Restored "${question.shortId}" to Draft`
          : `Archived "${question.shortId}" successfully`
      )
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle archive state")
    }
  }

  // Handle Bulk Action
  const handleBulkAction = async (action: "publish" | "archive" | "restore" | "delete") => {
    if (selectedIds.length === 0) return
    try {
      const res = await fetch("/api/admin/content-engine/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: selectedIds, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Bulk ${action} failed`)

      if (action === "delete") {
        setQuestions((prev) => prev.filter((q) => !selectedIds.includes(q.id)))
        toast.success(`Deleted ${data.affected} question(s)${data.blocked ? ` (${data.blocked} published blocked)` : ""}`)
      } else {
        const nextStatus =
          action === "publish" ? "PUBLISHED" : action === "archive" ? "ARCHIVED" : "DRAFT"
        const nextIsPublished = action === "publish"

        setQuestions((prev) =>
          prev.map((q) =>
            selectedIds.includes(q.id)
              ? { ...q, status: nextStatus, isPublished: nextIsPublished }
              : q
          )
        )
        toast.success(`Updated status for ${data.affected} question(s)`)
      }
      clearSelection()
    } catch (err: any) {
      toast.error(err.message || "Bulk action failed")
    }
  }

  // Handle Delete Confirmation
  const handleConfirmHardDelete = async () => {
    if (!questionToDelete) return
    const id = questionToDelete.id

    const res = await fetch(`/api/admin/content-engine/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete question")
    }

    setQuestions((prev) => prev.filter((q) => q.id !== id))
    toast.success(`Deleted question "${questionToDelete.shortId}"`)
    setQuestionToDelete(null)
  }

  const handleConfirmArchiveInstead = async () => {
    if (!questionToDelete) return
    await handleToggleArchive(questionToDelete)
    setQuestionToDelete(null)
  }

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQ.trim() || !newAnswer.trim()) {
      toast.error("Question and answer are required")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/content-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: newQ.trim(),
          options: newOptions.filter((o) => o.trim().length > 0),
          answer: newAnswer.trim(),
          sub: newSub.trim() || undefined,
          top: newTop.trim() || undefined,
          exam: newExam.trim() || undefined,
          year: newYear.trim() || undefined,
          status: "DRAFT",
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create question")

      setQuestions((prev) => [data.data, ...prev])
      toast.success("Question created successfully")
      setIsCreateOpen(false)
      setNewQ("")
      setNewOptions(["", "", "", ""])
      setNewAnswer("")
    } catch (err: any) {
      toast.error(err.message || "Failed to create question")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0a1628] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
              <FileQuestion className="w-3.5 h-3.5 text-indigo-600" />
              Content Engine &bull; Admin Studio
            </span>
            <span className="text-xs text-gray-500">• Question Repository</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Content Engine Studio
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage programmatic Q&A items, multilingual translations, taxonomy overrides, and publication statuses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 min-h-[40px] cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Review Queue ({needsReviewQuestions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setIsHindiReviewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 hover:bg-purple-100 dark:hover:bg-purple-900/40 min-h-[40px] cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Hindi Review</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAnswerCheckOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 dark:hover:bg-amber-900/40 min-h-[40px] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Answer Check</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBatchOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 min-h-[40px] cursor-pointer"
          >
            <FileQuestion className="w-4 h-4" />
            <span>Add Batch</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm min-h-[40px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Question</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0a1628] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Questions</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statusCounts.ALL}</p>
        </div>
        <div className="bg-white dark:bg-[#0a1628] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Published</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{statusCounts.PUBLISHED}</p>
        </div>
        <div className="bg-white dark:bg-[#0a1628] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Drafts</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{statusCounts.DRAFT}</p>
        </div>
        <div className="bg-white dark:bg-[#0a1628] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Archived</span>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">{statusCounts.ARCHIVED}</p>
        </div>
      </div>

      {/* Status Tabs, Filters & Bulk Action Bar */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
        {/* Status Tabs with counts */}
        <StudioStatusTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as ContentEngineTab)}
        />

        {/* Search & dropdown filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between pt-1">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by question text, shortId, topic..."
              aria-label="Search questions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[40px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Exam Filter */}
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              aria-label="Filter by Exam"
              className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white focus:outline-none min-h-[40px]"
            >
              <option value="ALL">All Exams</option>
              {uniqueExams.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>

            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filter by Subject"
              className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white focus:outline-none min-h-[40px]"
            >
              <option value="ALL">All Subjects</option>
              {uniqueSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        <StudioBulkActionBar
          totalItems={filteredQuestions.length}
          selectedCount={selectedCount}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          itemLabel="question"
          onBulkPublish={() => handleBulkAction("publish")}
          onBulkArchive={() => handleBulkAction("archive")}
          onBulkRestore={() => handleBulkAction("restore")}
          onBulkDelete={() => handleBulkAction("delete")}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">No questions found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50/80 dark:bg-[#071d33] border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                      aria-label="Select all questions"
                      data-testid="select-all-questions-table"
                    />
                  </th>
                  <th className="py-3 px-4">Question Text</th>
                  <th className="py-3 px-4">Taxonomy</th>
                  <th className="py-3 px-4 text-center">Translations</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredQuestions.map((q) => {
                  const isSelectedRow = isSelected(q.id)
                  const isPub = q.status === "PUBLISHED" || q.isPublished
                  const isArchived = q.status === "ARCHIVED"

                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors ${
                        isSelectedRow ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <Checkbox
                          checked={isSelectedRow}
                          onCheckedChange={() => toggleSelect(q.id)}
                          aria-label={`Select ${q.shortId}`}
                          data-testid={`select-q-${q.id}`}
                        />
                      </td>

                      {/* Question */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                          {q.q}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            {q.shortId}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Ans: <strong className="text-emerald-600 dark:text-emerald-400">{q.answer}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Taxonomy */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {q.exam && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-800 dark:text-gray-200">
                              <Tag className="w-3 h-3 text-indigo-500" />
                              {q.exam} {q.year ? `(${q.year})` : ""}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {q.sub || "General"} {q.top ? `↳ ${q.top}` : ""}
                          </span>
                          {q.override && (
                            <span className="inline-block text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              Override: {q.override.sub}/{q.override.top}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Translations */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                          <Globe className="w-3 h-3" />
                          {q._count?.translations || 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPub
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isArchived
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {isPub ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Published
                            </>
                          ) : isArchived ? (
                            <>
                              <Archive className="w-3 h-3" />
                              Archived
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Draft
                            </>
                          )}
                        </span>
                      </td>

                      {/* Row actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <StudioRowMenu
                            itemId={q.id}
                            itemTitle={q.shortId}
                            isArchived={isArchived}
                            onView={() => setViewingQuestion(q)}
                            onToggleArchive={() => handleToggleArchive(q)}
                            onDelete={() => setQuestionToDelete(q)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Impact Dialog */}
      {questionToDelete && (
        <StudioDeleteImpactDialog
          isOpen={Boolean(questionToDelete)}
          onClose={() => setQuestionToDelete(null)}
          itemType="Question"
          itemName={questionToDelete.shortId}
          itemId={questionToDelete.id}
          impactMetrics={[
            {
              label: "Translations",
              count: questionToDelete._count?.translations || 0,
              icon: <Globe className="w-3.5 h-3.5 text-blue-500" />,
            },
            {
              label: "Category Overrides",
              count: questionToDelete.override ? 1 : 0,
              icon: <Tag className="w-3.5 h-3.5 text-amber-500" />,
            },
          ]}
          hasDependencies={
            questionToDelete.status === "PUBLISHED" || questionToDelete.isPublished
          }
          dependencyNotice={
            questionToDelete.status === "PUBLISHED" || questionToDelete.isPublished
              ? "This question is currently PUBLISHED on live Q&A routes. Hard deletion is blocked to protect organic search traffic and revision sets. Archiving safely unpublishes it."
              : `Hard deleting this question will permanently erase ${questionToDelete._count?.translations || 0} translation(s) and any taxonomy overrides.`
          }
          isArchivedAlready={questionToDelete.status === "ARCHIVED"}
          onConfirmArchive={handleConfirmArchiveInstead}
          onConfirmHardDelete={handleConfirmHardDelete}
        />
      )}

      {/* Question Preview Modal */}
      {viewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <span className="font-mono text-xs font-bold text-gray-500">
                {viewingQuestion.shortId}
              </span>
              <button
                onClick={() => setViewingQuestion(null)}
                className="text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                {viewingQuestion.q}
              </p>
              {Array.isArray(viewingQuestion.options) && (
                <ul className="space-y-1.5 pl-2">
                  {viewingQuestion.options.map((opt: string, i: number) => (
                    <li
                      key={i}
                      className={`p-2 rounded-lg border text-xs ${
                        opt === viewingQuestion.answer
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-bold"
                          : "bg-gray-50 dark:bg-[#071d33] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {viewingQuestion.explanation && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#071d33] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-white block mb-0.5">Explanation:</span>
                <p>{viewingQuestion.explanation}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingQuestion(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[36px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isReviewOpen && (
        <ReviewModal
          questions={needsReviewQuestions}
          onClose={() => setIsReviewOpen(false)}
          onUpdated={refetchQuestions}
        />
      )}
      {isHindiReviewOpen && (
        <HindiReviewModal
          onClose={() => setIsHindiReviewOpen(false)}
          onChanged={refetchQuestions}
        />
      )}
      {isAnswerCheckOpen && (
        <AnswerCheckModal
          onClose={() => setIsAnswerCheckOpen(false)}
          onDone={refetchQuestions}
        />
      )}
      {isBatchOpen && (
        <AddBatchModal
          onClose={() => setIsBatchOpen(false)}
          onImported={() => {
            refetchQuestions()
          }}
        />
      )}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Create New Question</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Question Text *</label>
                <textarea
                  required
                  rows={3}
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                  placeholder="Enter question text here..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold">Options (4)</label>
                {newOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const copy = [...newOptions]
                      copy[i] = e.target.value
                      setNewOptions(copy)
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white min-h-[36px]"
                  />
                ))}
              </div>

              <div>
                <label className="block font-bold mb-1">Correct Answer *</label>
                <input
                  type="text"
                  required
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Exact answer string matching one of the options"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white min-h-[38px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Subject</label>
                  <input
                    type="text"
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    placeholder="e.g. Geography"
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white min-h-[36px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Topic</label>
                  <input
                    type="text"
                    value={newTop}
                    onChange={(e) => setNewTop(e.target.value)}
                    placeholder="e.g. Geomorphology"
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white min-h-[36px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Exam</label>
                  <input
                    type="text"
                    value={newExam}
                    onChange={(e) => setNewExam(e.target.value)}
                    placeholder="e.g. UPSC CSE"
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white min-h-[36px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Year</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-gray-900 dark:text-white min-h-[36px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 min-h-[38px] flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContentEngineStudioClient
