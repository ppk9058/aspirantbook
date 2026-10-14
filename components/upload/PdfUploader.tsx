"use client"

import React, { useRef, useState } from "react"
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react"
import { uploadPdf, UploadPdfResponse } from "@/lib/upload/client-pdf"

export interface PdfUploaderProps {
  label: string
  description?: string
  required?: boolean
  currentUrl?: string
  currentFileName?: string
  endpoint?: string
  folder?: string
  onUploadSuccess: (data: UploadPdfResponse) => void
  onClear?: () => void
  disabled?: boolean
}

export default function PdfUploader({
  label,
  description,
  required = false,
  currentUrl,
  currentFileName,
  endpoint = "/api/books/upload",
  folder = "books",
  onUploadSuccess,
  onClear,
  disabled = false,
}: PdfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localFileName, setLocalFileName] = useState<string | null>(currentFileName || null)

  const handleFile = async (file: File) => {
    setError(null)
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("Only PDF files are supported.")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File exceeds 50MB limit.")
      return
    }

    setIsUploading(true)
    setLocalFileName(file.name)

    try {
      const data = await uploadPdf(file, { endpoint, folder })
      onUploadSuccess(data)
    } catch (err: any) {
      setError(err.message || "Upload failed")
      setLocalFileName(null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || isUploading) return
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {currentUrl && (
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Uploaded
          </span>
        )}
      </div>

      {description && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{description}</p>
      )}

      {currentUrl ? (
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate block">
                {localFileName || currentFileName || "Document.pdf"}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono block">
                Ready for preview / publication
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="px-2.5 py-1 text-xs font-bold text-sky-700 hover:text-sky-800 dark:text-sky-300 underline"
            >
              Replace
            </button>
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  setLocalFileName(null)
                  onClear()
                }}
                disabled={disabled || isUploading}
                className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                title="Remove PDF"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isUploading) fileInputRef.current?.click()
          }}
          className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            dragOver
              ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
              : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 bg-gray-50/50 dark:bg-slate-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
              <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                Uploading and inspecting PDF...
              </span>
              <span className="text-[11px] text-gray-400">Detecting pages and file size</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  Click to browse or drag &amp; drop PDF
                </span>
                <span className="text-[11px] text-gray-400 block mt-0.5">
                  Max file size: 50MB (PDF format only)
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0])
          }
        }}
        disabled={disabled || isUploading}
      />

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
