"use client"

import React, { useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, RotateCcw, X, ExternalLink } from "lucide-react"

export interface PublishTestModalProps {
    isOpen: boolean
    onClose: () => void
    testId: string
    testTitle?: string
    onSuccess: () => void
    beforePublish?: () => Promise<boolean>
    reviewUrl?: string
}

export default function PublishTestModal({
    isOpen,
    onClose,
    testId,
    testTitle,
    onSuccess,
    beforePublish,
    reviewUrl,
}: PublishTestModalProps) {
    const [isPublishing, setIsPublishing] = useState(false)
    const [publishError, setPublishError] = useState<string | null>(null)
    const [publishErrorDetails, setPublishErrorDetails] = useState<string[]>([])

    if (!isOpen) return null

    const handleConfirmPublish = async () => {
        setPublishError(null)
        setPublishErrorDetails([])

        // Optional pre-publish step (e.g., Edit page runs Save Changes first)
        if (beforePublish) {
            try {
                const canProceed = await beforePublish()
                if (!canProceed) return
            } catch (err: any) {
                setPublishError(err.message || "Pre-publish save failed. Please check your questions.")
                return
            }
        }

        setIsPublishing(true)
        try {
            const res = await fetch(`/api/exam/test/${encodeURIComponent(testId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPublished: true }),
            })

            const json = await res.json()
            if (!res.ok) {
                const errMsg = json.error || `Publish failed with status ${res.status}`
                setPublishError(errMsg)
                if (Array.isArray(json.details)) {
                    setPublishErrorDetails(json.details)
                }
                return
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            console.error("Publish test error:", err)
            setPublishError(err.message || "Failed to publish test. Please try again.")
        } finally {
            setIsPublishing(false)
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            data-testid="publish-confirm-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
            <div className="w-full max-w-lg bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <span>Publish Test</span>
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPublishing}
                        className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        Publish this test? Students will be able to attempt it.
                    </p>
                    {testTitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium break-words">
                            Test: <span className="font-bold text-gray-700 dark:text-gray-300">{testTitle}</span>
                        </p>
                    )}
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        Once published, the structure (sections, marks, duration) is locked to protect learner integrity. You can still edit question content and explanations later.
                    </div>
                </div>

                {publishError && (
                    <div
                        data-testid="publish-error-banner"
                        className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-xs space-y-3"
                    >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-start gap-2 text-red-700 dark:text-red-400 min-w-0">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Error publishing test</p>
                                    <p className="break-words">{publishError}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleConfirmPublish}
                                disabled={isPublishing}
                                data-testid="publish-retry-button"
                                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs min-h-[44px]"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Retry</span>
                            </button>
                        </div>

                        {publishErrorDetails.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-red-200 dark:border-red-900/50">
                                <p className="font-bold text-red-800 dark:text-red-300 text-[11px]">
                                    Incomplete questions ({publishErrorDetails.length}):
                                </p>
                                <ul className="pl-5 list-disc space-y-1 text-red-700 dark:text-red-300 text-[11px] max-h-40 overflow-y-auto">
                                    {publishErrorDetails.map((d, i) => (
                                        <li key={i}>{d}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {reviewUrl && (
                            <div className="pt-1">
                                <Link
                                    href={reviewUrl}
                                    data-testid="publish-review-link"
                                    onClick={onClose}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:underline min-h-[44px]"
                                >
                                    <span>Open Review page to inspect questions</span>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex-wrap">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPublishing}
                        data-testid="publish-cancel-button"
                        className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer min-h-[44px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmPublish}
                        disabled={isPublishing}
                        data-testid="confirm-publish-button"
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md min-h-[44px]"
                    >
                        {isPublishing ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Publishing…</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Publish Now</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
