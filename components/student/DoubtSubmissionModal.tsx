"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import {
  X,
  HelpCircle,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react"

interface DoubtSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  prefillSubject?: string
}

const SUBJECTS = [
  "Python & Data Science",
  "Full-Stack Web Development",
  "Data Structures & Algorithms",
  "Artificial Intelligence & ML",
  "System Design & Cloud",
  "General / Other",
]

export default function DoubtSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
  prefillSubject,
}: DoubtSubmissionModalProps) {
  const { data: session } = useSession()
  const { openMobileAuth } = useMobileAuth()
  const [subject, setSubject] = useState(prefillSubject || SUBJECTS[0])
  const [topic, setTopic] = useState("")
  const [questionText, setQuestionText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    // 10MB limit
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must be under 10MB.")
      return
    }

    setFile(selected)
    setErrorMessage(null)

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(selected)
    } else {
      setFilePreview(null)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionText.trim()) {
      setErrorMessage("Please enter your question.")
      return
    }

    if (!session?.user) {
      openMobileAuth({
        actionType: "login",
      })
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      let attachmentData: any = undefined

      if (file) {
        const formData = new FormData()
        formData.append("file", file)
        const isPdf = file.type === "application/pdf"
        formData.append("type", isPdf ? "pdf" : "image")

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          const errJson = await uploadRes.json().catch(() => ({}))
          throw new Error(errJson.error || "Failed to upload attached document.")
        }

        const uploadJson = await uploadRes.json()
        attachmentData = {
          name: file.name,
          url: uploadJson.upload.url,
          type: isPdf ? "pdf" : "image",
          size: `${Math.round(file.size / 1024)} KB`,
        }
      }

      const res = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic: topic.trim() || undefined,
          questionText: questionText.trim(),
          attachment: attachmentData,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || "Failed to submit doubt.")
      }

      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        setQuestionText("")
        setTopic("")
        handleRemoveFile()
        onClose()
        if (onSuccess) onSuccess()
      }, 1500)
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0a2540]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1448d8]/15 flex items-center justify-center text-[#1448d8]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                Ask a Doubt
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Direct faculty answer & peer learning support
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">
                Doubt submitted successfully!
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Your teachers have been notified and will answer shortly.
              </p>
            </div>
          )}

          {!isSuccess && (
            <>
              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Subject / Category
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1448d8]"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic / Concept */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Specific Topic / Concept (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Backpropagation, Dynamic Programming, Async/Await"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8]"
                />
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Your Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain what you are trying to solve, where you are getting stuck, and what you have already tried..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full text-sm p-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8] resize-none"
                />
              </div>

              {/* File Upload (Image or PDF) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Attach Screenshot or PDF (Optional, max 10MB)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="doubt-file-upload"
                />

                {!file ? (
                  <label
                    htmlFor="doubt-file-upload"
                    className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#1448d8] dark:hover:border-[#1448d8] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-colors bg-gray-50/50 dark:bg-gray-900/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#1448d8]/10 text-[#1448d8] flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        Click to upload an image or PDF
                      </p>
                      <p className="text-[11px] text-gray-400">
                        PNG, JPG, WebP or PDF documents up to 10MB
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="preview"
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {Math.round(file.size / 1024)} KB &bull; {file.type.split("/")[1]?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !questionText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-semibold shadow-md shadow-[#1448d8]/20 flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Post Doubt
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
