"use client"

import { useState } from "react"
import {
  Sparkles,
  Bot,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileText,
  Languages,
  CheckCheck,
  AlertTriangle,
  RotateCw,
} from "lucide-react"
import {
  createExplanationBatchJobAction,
  createTranslationBatchJobAction,
  createCurrentAffairsBatchJobAction,
  createQuizFromArticleAction,
  processBatchJobAction,
  approveBatchItemAction,
  rejectBatchItemAction,
  bulkApproveBatchItemsAction,
} from "@/lib/actions/admin/ai-batch"

interface AiBatchStudioProps {
  jobs: any[]
  examSections: any[]
  currentAffairsCount: number
  aiEnabled: boolean
  killSwitchActive: boolean
  providersConfigured: string[]
}

export function AiBatchStudioClient({
  jobs: initialJobs,
  examSections,
  currentAffairsCount,
  aiEnabled,
  killSwitchActive,
  providersConfigured,
}: AiBatchStudioProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [selectedTab, setSelectedTab] = useState<"new" | "jobs" | "drafts">("jobs")
  const [activeJobId, setActiveJobId] = useState<string | null>(
    initialJobs[0]?.id || null
  )
  const [processingJobId, setProcessingJobId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Creation form states
  const [selectedSectionId, setSelectedSectionId] = useState(
    examSections[0]?.id || ""
  )
  const [articleText, setArticleText] = useState("")
  const [quizQuestionCount, setQuizQuestionCount] = useState(5)
  const [isCreating, setIsCreating] = useState(false)

  // Edit draft item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editedText, setEditedText] = useState("")

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0]

  const handleProcessBatch = async (jobId: string) => {
    try {
      setProcessingJobId(jobId)
      setActionError(null)
      setActionMessage("Processing batch step...")
      const res = await processBatchJobAction(jobId, 5)
      if (res.success) {
        setActionMessage(
          `Processed ${res.processedCount} items. Status: ${res.status}${
            res.pausedReason ? ` (Paused: ${res.pausedReason})` : ""
          }`
        )
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to process batch")
    } finally {
      setProcessingJobId(null)
    }
  }

  const handleApprove = async (itemId: string, edited?: any) => {
    try {
      setActionError(null)
      await approveBatchItemAction(itemId, edited)
      setActionMessage("Item approved and saved to database.")
      setEditingItemId(null)
    } catch (err: any) {
      setActionError(err.message || "Failed to approve item")
    }
  }

  const handleReject = async (itemId: string) => {
    try {
      setActionError(null)
      await rejectBatchItemAction(itemId)
      setActionMessage("Item draft rejected.")
    } catch (err: any) {
      setActionError(err.message || "Failed to reject item")
    }
  }

  const handleBulkApprove = async (jobId: string) => {
    try {
      setActionError(null)
      const res = await bulkApproveBatchItemsAction(jobId)
      setActionMessage(`Bulk approved ${res.approvedCount} drafts into production!`)
    } catch (err: any) {
      setActionError(err.message || "Bulk approval failed")
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1448d8] dark:text-blue-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Batch Jobs Studio
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Admin-triggered jobs running on free-tier providers. Zero auto-publishing.
            </p>
          </div>
        </div>

        {/* Global Gateway Status Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {aiEnabled && !killSwitchActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              AI Layer Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              {killSwitchActive ? "Kill Switch Active" : "AI Disabled (Flag Off)"}
            </span>
          )}

          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {providersConfigured.length > 0
              ? `Configured: ${providersConfigured.join(", ")}`
              : "No provider keys configured"}
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-2">
        <button
          onClick={() => setSelectedTab("jobs")}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors min-h-[44px] flex items-center gap-2 ${
            selectedTab === "jobs"
              ? "border-[#1448d8] text-[#1448d8] dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <Layers className="w-4 h-4" />
          Batch Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setSelectedTab("new")}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors min-h-[44px] flex items-center gap-2 ${
            selectedTab === "new"
              ? "border-[#1448d8] text-[#1448d8] dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <Bot className="w-4 h-4" />
          Create Job
        </button>
        <button
          onClick={() => setSelectedTab("drafts")}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors min-h-[44px] flex items-center gap-2 ${
            selectedTab === "drafts"
              ? "border-[#1448d8] text-[#1448d8] dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          Review & Approve Drafts
        </button>
      </div>

      {/* TAB 1: CREATE NEW JOB */}
      {selectedTab === "new" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Explanation Generator Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
              <FileText className="w-4 h-4 text-[#1448d8]" />
              Generate Question Explanations
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Generates bilingual (English + Hindi) pedagogical explanations for questions in an exam section.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Select Exam Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
              >
                {examSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.test?.title || "Exam"} - {s.title || "Section"} ({s._count?.questions || 0} questions)
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={async () => {
                if (!selectedSectionId) return
                setIsCreating(true)
                try {
                  const res = await createExplanationBatchJobAction(selectedSectionId)
                  if (res.success) {
                    setActionMessage("Explanation batch job created successfully!")
                    setSelectedTab("jobs")
                  }
                } catch (err: any) {
                  setActionError(err.message)
                } finally {
                  setIsCreating(false)
                }
              }}
              disabled={isCreating || !selectedSectionId}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Explanation Job
            </button>
          </div>

          {/* Hindi Translation Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
              <Languages className="w-4 h-4 text-emerald-600" />
              Hindi Question Translation
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Translates English questions, options, and explanations to Hindi with competitive exam terminology.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Select Exam Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
              >
                {examSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.test?.title || "Exam"} - {s.title || "Section"} ({s._count?.questions || 0} questions)
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={async () => {
                if (!selectedSectionId) return
                setIsCreating(true)
                try {
                  const res = await createTranslationBatchJobAction(selectedSectionId)
                  if (res.success) {
                    setActionMessage("Translation batch job created successfully!")
                    setSelectedTab("jobs")
                  }
                } catch (err: any) {
                  setActionError(err.message)
                } finally {
                  setIsCreating(false)
                }
              }}
              disabled={isCreating || !selectedSectionId}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Languages className="w-4 h-4" />
              Create Translation Job
            </button>
          </div>

          {/* Current Affairs Summary Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
              <FileText className="w-4 h-4 text-amber-600" />
              Current Affairs Summaries
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Summarizes recent current affairs into bilingual exam bullet points ({currentAffairsCount} items available).
            </p>
            <button
              onClick={async () => {
                setIsCreating(true)
                try {
                  const res = await createCurrentAffairsBatchJobAction(10)
                  if (res.success) {
                    setActionMessage("Current affairs summary job created!")
                    setSelectedTab("jobs")
                  }
                } catch (err: any) {
                  setActionError(err.message)
                } finally {
                  setIsCreating(false)
                }
              }}
              disabled={isCreating || currentAffairsCount === 0}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Generate CA Summaries (Batch 10)
            </button>
          </div>

          {/* Quiz from Article Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Generate Quiz From Article
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paste news editorial or syllabus text to generate MCQ questions with 4 options and answers.
            </p>
            <textarea
              rows={4}
              value={articleText}
              onChange={(e) => setArticleText(e.target.value)}
              placeholder="Paste article, editorial, or chapter text here (min 50 chars)..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={async () => {
                if (!articleText.trim()) return
                setIsCreating(true)
                try {
                  const res = await createQuizFromArticleAction(articleText, quizQuestionCount)
                  if (res.success) {
                    setActionMessage("Quiz generation job created!")
                    setSelectedTab("jobs")
                    setArticleText("")
                  }
                } catch (err: any) {
                  setActionError(err.message)
                } finally {
                  setIsCreating(false)
                }
              }}
              disabled={isCreating || articleText.trim().length < 50}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Generate Quiz Questions
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE & COMPLETED JOBS */}
      {selectedTab === "jobs" && (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Bot className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                No batch jobs found
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Create a new batch job to generate explanations, translations, or quizzes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {jobs.map((job) => {
                const isProcessing = processingJobId === job.id
                const pct = Math.round((job.progress || 0) * 100)

                return (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            {job.jobType.replace(/_/g, " ")}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                              job.status === "COMPLETED"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                : job.status === "PROCESSING"
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 animate-pulse"
                                : job.status === "PAUSED"
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(job.createdAt).toLocaleString()} • {job.totalItems} total items
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        {job.status !== "COMPLETED" && (
                          <button
                            onClick={() => handleProcessBatch(job.id)}
                            disabled={isProcessing}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                          >
                            {isProcessing ? (
                              <>
                                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                Run Batch Step
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActiveJobId(job.id)
                            setSelectedTab("drafts")
                          }}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          View Drafts
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Progress: {pct}%</span>
                        <span>
                          {job.processedItems} processed / {job.failedItems} failed / {job.totalItems} total
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full bg-[#1448d8] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {job.errorMessage && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                        Notice: {job.errorMessage}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REVIEW & APPROVE DRAFTS */}
      {selectedTab === "drafts" && (
        <div className="space-y-6">
          {/* Active Job Selector & Bulk Approve */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Viewing Job:
              </label>
              <select
                value={activeJobId || ""}
                onChange={(e) => setActiveJobId(e.target.value)}
                className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobType} ({j.status}) - {new Date(j.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {activeJob && (
              <button
                onClick={() => handleBulkApprove(activeJob.id)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Approve All DRAFTs In Job
              </button>
            )}
          </div>

          {/* Items List */}
          {!activeJob || !activeJob.items || activeJob.items.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-xs text-gray-500">No items available for this job.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeJob.items.map((item: any, idx: number) => {
                const isDraft = item.status === "DRAFT"
                const isApproved = item.status === "APPROVED"
                const isPending = item.status === "PENDING"
                const isFailed = item.status === "FAILED"

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        Item #{idx + 1} • Ref: {item.referenceId || "Direct input"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          isApproved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : isDraft
                            ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                            : isFailed
                            ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Input preview */}
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 font-mono">
                      <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                        Input
                      </div>
                      <pre className="whitespace-pre-wrap font-sans">
                        {item.input?.questionText ||
                          item.input?.questionEn ||
                          item.input?.title ||
                          JSON.stringify(item.input, null, 2)}
                      </pre>
                    </div>

                    {/* Output preview */}
                    {item.output && (
                      <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-xs text-gray-900 dark:text-gray-100">
                        <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">
                          Generated AI Draft
                        </div>
                        <pre className="whitespace-pre-wrap font-sans">
                          {JSON.stringify(item.output, null, 2)}
                        </pre>
                      </div>
                    )}

                    {item.error && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
                        Error: {item.error}
                      </div>
                    )}

                    {/* Item Actions */}
                    {isDraft && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve Draft
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className="min-h-[44px] px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
