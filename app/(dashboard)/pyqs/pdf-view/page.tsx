"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, AlertCircle } from "lucide-react"
import SecurePdfViewer from "@/components/pdf/SecurePdfViewer"
import { AuthwallGate } from "@/components/authwall/AuthwallGate"
import { AuthwallUnlockToast } from "@/components/authwall/AuthwallUnlockToast"

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
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1448d8] text-white text-xs font-semibold hover:bg-[#0f37a8] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to All Previous Year Papers
          </Link>
        </div>
      </div>
    )
  }

  if (paper.isLockedForGuest) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="mb-4">
          <Link
            href="/pyqs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to All Previous Year Papers
          </Link>
        </div>
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs mb-4">
          <h1 className="text-xl font-bold text-gray-900">{paper.title}</h1>
          <p className="text-xs text-gray-500 mt-1">
            {paper.category?.name || "Official PYQ"} • {paper.year} • {paper.stage}
          </p>
        </div>
        <AuthwallGate
          title={paper.gateTitle || `Sign in to access ${paper.title}`}
          subtitle={
            paper.gateSubtitle ||
            "This official previous year question paper is gated. Sign in to view and download full paper and solutions."
          }
          moduleName="PYQ Paper"
          effectivePercentage={paper.previewPercentage ?? 20}
        />
        <AuthwallUnlockToast />
      </div>
    )
  }

  return (
    <>
      <SecurePdfViewer
        isOpen={true}
        onClose={() => router.push("/pyqs")}
        src={`/api/pyqs/file/${paper.id}`}
        downloadUrl={`/api/pyqs/file/${paper.id}?download=1`}
        title={paper.title}
        subtitle={`${paper.category?.name || "Official PYQ"} • ${paper.year} • ${paper.stage}`}
        author={paper.subject || undefined}
        downloadAllowed={true}
        badgeLabel="Official PYQ Paper"
        testId="pyq-pdf-viewer"
      />
      <AuthwallUnlockToast />
    </>
  )
}
