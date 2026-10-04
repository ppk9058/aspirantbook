"use client"

import React, { useEffect } from "react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Global application error:", error)
    }, [error])

    return (
        <html lang="en">
            <body className="m-0 p-0 font-sans bg-gray-50 text-gray-900 antialiased">
                <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                    <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
                        <div className="mx-auto w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                            <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                                Something went wrong
                            </h1>
                            <p className="text-sm text-gray-600">
                                An unexpected error occurred while loading this page. Our team has been notified.
                            </p>
                            {error?.digest && (
                                <p className="text-xs font-mono bg-gray-100 text-gray-500 py-1 px-2 rounded-md break-all">
                                    Error Digest: {error.digest}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => reset()}
                                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Try Again
                            </button>
                            <a
                                href="/dashboard"
                                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                            >
                                Go to Dashboard
                            </a>
                        </div>
                    </div>
                </main>
            </body>
        </html>
    )
}
