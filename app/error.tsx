"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { AlertCircle, RotateCcw, Home } from "lucide-react"

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Root page error boundary caught error:", error)
    }, [error])

    return (
        <main className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                    <AlertCircle className="w-8 h-8" aria-hidden="true" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                        Unexpected Error
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        We encountered an issue while loading this view. You can retry or head back to the dashboard.
                    </p>
                    {error?.digest && (
                        <p className="text-xs font-mono bg-muted text-muted-foreground py-1 px-2 rounded-md break-all">
                            ID: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Try Again</span>
                    </button>
                    <Link
                        href="/dashboard"
                        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all gap-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <Home className="w-4 h-4" />
                        <span>Dashboard</span>
                    </Link>
                </div>
            </div>
        </main>
    )
}
