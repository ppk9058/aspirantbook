"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react"

export default function ExamError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Exam flow error boundary caught error:", error)
    }, [error])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-gray-950 text-center">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" aria-hidden="true" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Exam Session Interrupted
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        An error occurred during this exam view. Your saved answers and progress in active tests remain safely stored on our servers.
                    </p>
                    {error?.digest && (
                        <p className="text-[11px] font-mono text-gray-400 bg-gray-50 dark:bg-gray-800/60 py-1 px-2 rounded break-all">
                            Session ID: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Resume Test</span>
                    </button>
                    <Link
                        href="/my-tests"
                        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm gap-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>My Tests</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
