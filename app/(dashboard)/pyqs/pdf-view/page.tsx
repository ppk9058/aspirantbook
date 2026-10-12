"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Download,
  AlertCircle,
  FileText,
  Zap,
  CheckCircle2,
  Lock,
} from "lucide-react"

export default function PYQPDFViewerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const paperId = searchParams.get("paperId")

  const [paper, setPaper] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!paperId) {
      setError("This paper is unavailable or restricted")
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    fetch(`/api/pyqs/${paperId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("This paper is unavailable or restricted")
        }
        return res.json()
      })
      .then((data) => {
        if (isMounted) {
          setPaper(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "This paper is unavailable or restricted")
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [paperId])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-gray-500">Loading examination paper...</p>
      </div>
    )
  }

  if (error || !paper) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1.5">
            {error || "This paper is unavailable or restricted"}
          </h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            The requested paper cannot be accessed or may be an unpublished draft.
          </p>
          <Link
            href="/pyqs"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to All Previous Year Papers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/pyqs"
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shrink-0"
            title="Back to PYQs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                {paper.category?.name || "Official PYQ"}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {paper.year}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {paper.stage}
              </span>
              {paper.subject && (
                <span className="text-[11px] font-medium text-gray-600">
                  {paper.subject}
                </span>
              )}
            </div>

            <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">
              {paper.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {paper.hasCbtMode && paper.cbtTestId && (
            <Link
              href={`/test-series/${paper.cbtTestId}/instructions?testId=${paper.cbtTestId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              Attempt Test
            </Link>
          )}

          <a
            href={`/api/pyqs/file/${paper.id}?download=1`}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
        </div>
      </div>

      {/* PDF Stream Frame */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden h-[82vh] w-full">
        <iframe
          src={`/api/pyqs/file/${paper.id}`}
          className="w-full h-full border-0"
          title={paper.title}
        />
      </div>
    </div>
  )
}
