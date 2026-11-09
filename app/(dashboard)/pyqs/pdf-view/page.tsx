"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, AlertCircle, Lock, Crown, ArrowRight, Loader2 } from "lucide-react"
import { PdfReaderFrame } from "@/components/pdf/PdfReaderFrame"
import { AuthwallGate } from "@/components/authwall/AuthwallGate"
import { AuthwallUnlockToast } from "@/components/authwall/AuthwallUnlockToast"
import { buildPassLoginHref } from "@/lib/pyqs/pass-popup"
import { usePyqPassUnlock } from "@/lib/pyqs/usePyqPassUnlock"

export default function PYQPDFViewerPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const paperId = searchParams.get("paperId")
  const currentPath = `${pathname || "/pyqs/pdf-view"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`

  const [paper, setPaper] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passRequired, setPassRequired] = useState(false)
  const [loginRequired, setLoginRequired] = useState(false)
  // Bumped after a verified Pass payment so the access probe runs again and the
  // same page renders the unlocked viewer (no /subscription redirect).
  const [probeKey, setProbeKey] = useState(0)

  const {
    openPassCheckout,
    isProcessing: isPassProcessing,
    error: passError,
  } = usePyqPassUnlock({
    autoOpenEnabled: passRequired,
    isAuthenticated: !loginRequired,
    onUnlocked: () => setProbeKey((key) => key + 1),
  })

  useEffect(() => {
    if (!paperId) {
      setError("This paper is unavailable or restricted")
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)
    setPassRequired(false)
    setLoginRequired(false)

    fetch(`/api/pyqs/${paperId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("This paper is unavailable or restricted")
        }
        return res.json()
      })
      .then(async (data) => {
        if (!isMounted) return
        setPaper(data)

        // Probe /api/pyqs/file to check whether an active Pass or login is required
        try {
          const fileRes = await fetch(`/api/pyqs/file/${paperId}`, {
            method: "GET",
            redirect: "manual",
          })
          if (fileRes.status === 403) {
            const errData = await fileRes.json().catch(() => ({}))
            if (errData?.code === "PASS_REQUIRED") {
              if (isMounted) setPassRequired(true)
            } else if (errData?.code === "LOGIN_REQUIRED") {
              if (isMounted) setLoginRequired(true)
            } else {
              if (isMounted) setError("You don't have access to this document.")
            }
          } else if (fileRes.status === 401) {
            if (isMounted) setLoginRequired(true)
          } else if (fileRes.status === 404) {
            if (isMounted) setError("File not found.")
          } else if (fileRes.status >= 400) {
            if (isMounted) setError("Could not load the document.")
          }
          try {
            await fileRes.body?.cancel()
          } catch {
            // Body closed
          }
        } catch {
          // Probe network error is ignorable; viewer will handle or render stream
        }

        if (isMounted) {
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
  }, [paperId, probeKey])

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

  if (loginRequired) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-gray-900 pt-2">
              Please log in to view this paper
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Sign in to your AspirantBook account to access official previous year question papers.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Link
              href={buildPassLoginHref(currentPath)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold transition-colors shadow-sm"
            >
              <span>Log in to continue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/pyqs"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-gray-600 hover:text-gray-900 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Previous Year Papers</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (passRequired) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-amber-200 p-8 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              All-Access Pass Required
            </span>
            <h2 className="text-lg font-black text-gray-900 pt-2">
              This paper needs the AspirantBook Pass
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Unlock this official previous year paper, complete solutions, and full CBT mock simulation with the AspirantBook Pass.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => void openPassCheckout()}
              disabled={isPassProcessing}
              data-testid="pyq-pass-unlock-cta"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-60"
            >
              {isPassProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Opening checkout...</span>
                </>
              ) : (
                <>
                  <span>Get AspirantBook Pass</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {passError && (
              <p role="alert" className="text-[11px] font-semibold text-red-600 px-1">
                {passError}
              </p>
            )}

            <Link
              href="/pyqs"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-gray-600 hover:text-gray-900 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Previous Year Papers</span>
            </Link>
          </div>
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
      <PdfReaderFrame
        src={`/api/pyqs/file/${paper.id}`}
        downloadUrl={`/api/pyqs/file/${paper.id}?download=1`}
        title={paper.title}
        subtitle={`${paper.category?.name || "Official PYQ"} • ${paper.year} • ${paper.stage}`}
        badgeLabel="Official PYQ Paper"
        fallbackBackUrl="/pyqs"
        testId="pyq-pdf-viewer"
      />
      <AuthwallUnlockToast />
    </>
  )
}
