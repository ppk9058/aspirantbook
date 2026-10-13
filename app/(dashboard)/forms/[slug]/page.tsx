"use client"

import { useState, use, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  X,
  Loader2,
  ShieldCheck,
  Send,
  Download,
  Copy,
  Check,
} from "lucide-react"
import { FORM_DEFINITIONS } from "@/lib/forms-config"

export default function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  const formDef = FORM_DEFINITIONS[slug]

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<any | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!formDef) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Form Not Found</h2>
        <p className="text-sm text-gray-500">The requested form does not exist or has been closed.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1448d8] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

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
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      let attachmentUrl: string | undefined = undefined
      let attachmentName: string | undefined = undefined

      if (file) {
        const uploadForm = new FormData()
        uploadForm.append("file", file)
        const isPdf = file.type === "application/pdf"
        uploadForm.append("type", isPdf ? "pdf" : "image")

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm,
        })

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}))
          throw new Error(errData.error || "File upload failed. Please try again.")
        }

        const uploadData = await uploadRes.json()
        attachmentUrl = uploadData.upload.url
        attachmentName = file.name
      }

      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formSlug: slug,
          formData,
          attachmentUrl,
          attachmentName,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to submit form.")
      }

      const resData = await res.json()
      setSubmissionResult(resData.submission)
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyRefId = () => {
    if (submissionResult?.id) {
      navigator.clipboard.writeText(submissionResult.id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Dashboard</span>
      </Link>

      {/* Confirmation State */}
      {submissionResult ? (
        <div className="bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              Submission Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              Application Successfully Submitted!
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              Thank you for submitting your details for <strong>{formDef.title}</strong>. Our admissions & academic administration team will review your application.
            </p>
          </div>

          {/* Reference Receipt Card */}
          <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 max-w-md mx-auto text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Submission Reference ID</span>
              <button
                onClick={copyRefId}
                className="inline-flex items-center gap-1 text-[#1448d8] hover:underline font-semibold"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="font-mono text-sm font-bold text-gray-900 dark:text-white tracking-wide">
              {submissionResult.id}
            </p>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 text-[11px] text-gray-500 flex justify-between">
              <span>Timestamp:</span>
              <span>{new Date(submissionResult.submittedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold shadow-md shadow-[#1448d8]/20 transition-all"
            >
              Go to Learning Dashboard
            </Link>
            <button
              onClick={() => window.print()}
              className="px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      ) : (
        /* Form Card */
        <div className="bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-[#05192D] via-[#0a2540] to-[#0d2f52] text-white relative">
            <div className="relative z-10 space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-[#1448d8]/20 border border-[#1448d8]/40 text-teal-300 text-xs font-bold">
                {formDef.badge}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{formDef.title}</h1>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl">{formDef.description}</p>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {errorMessage && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              {formDef.fields.map((field) => {
                if (field.type === "textarea") {
                  return (
                    <div key={field.name} className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        rows={4}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ""}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full text-sm p-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8] resize-none"
                      />
                      {field.helpText && <p className="text-[11px] text-gray-400">{field.helpText}</p>}
                    </div>
                  )
                }

                if (field.type === "select") {
                  return (
                    <div key={field.name} className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        required={field.required}
                        value={formData[field.name] || ""}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1448d8]"
                      >
                        <option value="">-- Please Select --</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {field.helpText && <p className="text-[11px] text-gray-400">{field.helpText}</p>}
                    </div>
                  )
                }

                if (field.type === "file") {
                  return (
                    <div key={field.name} className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={field.accept || "image/*,application/pdf"}
                        onChange={handleFileChange}
                        className="hidden"
                        id={`file-${field.name}`}
                      />

                      {!file ? (
                        <label
                          htmlFor={`file-${field.name}`}
                          className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#1448d8] dark:hover:border-[#1448d8] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-center transition-colors bg-gray-50/50 dark:bg-gray-900/30"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#1448d8]/10 text-[#1448d8] flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                              Click to select and upload document
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {field.helpText || "PDF, PNG, JPG up to 10MB"}
                            </p>
                          </div>
                        </label>
                      ) : (
                        <div className="p-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
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
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div key={field.name} className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8]"
                    />
                    {field.helpText && <p className="text-[11px] text-gray-400">{field.helpText}</p>}
                  </div>
                )
              })}
            </div>

            {/* Submission Safety Notice */}
            <div className="pt-2 flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Your data is encrypted, verified by RBAC entitlement, and strictly confidential.</span>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold shadow-lg shadow-[#1448d8]/25 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
