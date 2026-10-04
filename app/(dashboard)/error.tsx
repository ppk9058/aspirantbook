"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Dashboard route error boundary:", error)
    }, [error])

    return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-6 text-center">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
                <div className="mx-auto w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Unable to load content
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        We couldn't retrieve this page right now. Your progress and account data remain completely safe.
                    </p>
                    {error?.digest && (
                        <p className="text-[11px] font-mono text-gray-400 bg-gray-50 dark:bg-gray-800/60 py-1 px-2 rounded break-all">
                            Digest: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry</span>
                    </button>
                    <Link
                        href="/dashboard"
                        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm gap-2 transition-colors"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
