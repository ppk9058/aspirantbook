import React from "react"
import Link from "next/link"
import { Home, BookOpen, GraduationCap, Search } from "lucide-react"

export default function NotFound() {
    return (
        <main className="min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
                <div className="space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-primary/10 text-primary">
                        404 • Page Not Found
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                        Looking for something?
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
                        The page or resource you requested doesn't exist or may have been relocated.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                    <Link
                        href="/dashboard"
                        className="flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <Home className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-foreground">Dashboard</span>
                        <span className="text-[11px] text-muted-foreground">Return to learning hub</span>
                    </Link>

                    <Link
                        href="/courses"
                        className="flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]"
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-foreground">Courses</span>
                        <span className="text-[11px] text-muted-foreground">Browse all tutorials</span>
                    </Link>

                    <Link
                        href="/test-series"
                        className="flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]"
                    >
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-foreground">Test Series</span>
                        <span className="text-[11px] text-muted-foreground">Mock tests & PYQs</span>
                    </Link>
                </div>

                <div className="pt-2">
                    <Link
                        href="/search"
                        className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-primary hover:underline min-h-[44px] px-4"
                    >
                        <Search className="w-4 h-4" />
                        <span>Search the entire catalog</span>
                    </Link>
                </div>
            </div>
        </main>
    )
}
