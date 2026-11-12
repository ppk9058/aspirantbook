"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

// Custom labels for specific routes
const ROUTE_LABELS: Record<string, string> = {
    "career": "Career Tracks",
    "skills": "Skill Tracks",
    "courses": "Courses",
    "practice": "Practice",
    "assessments": "Test",
    "tutorials": "Tutorials",
    "projects": "Real World Projects",
    "code-along": "Code Along",
    "leaderboard": "Leaderboard",
    "settings": "Settings",
    "profile": "Profile",
    "admin": "Admin",
    "teacher": "Teacher",
    "test-series": "Test Series",
    "pyqs": "PYQ Studio",
    "batches": "Batches & Prep",
    "packages": "Packages",
    "package": "Package",
    "users": "Users",
    "dashboard": "Dashboard",
    "my-tests": "My Tests",
    "my-learning": "My Batches & Enrollment",
    "books": "Books",
    "current-affairs-quizzes": "Current Affairs",
}

// Segments to skip in breadcrumbs (no dedicated page)
const SKIP_SEGMENTS = ["tracks"]

export default function Breadcrumbs() {
    const pathname = usePathname()
    const homeHref = "/dashboard"
    const [dynamicTitles, setDynamicTitles] = useState<Record<string, string>>({})

    const segments = pathname ? pathname.split("/").filter(Boolean) : []

    useEffect(() => {
        const handleUpdate = (e: Event) => {
            const custom = e as CustomEvent<{ segment: string; title: string }>
            if (custom.detail?.segment && custom.detail?.title) {
                setDynamicTitles(prev => ({
                    ...prev,
                    [custom.detail.segment]: custom.detail.title,
                }))
            }
        }
        window.addEventListener("update-breadcrumb-title", handleUpdate)

        try {
            const cached: Record<string, string> = {}
            const currentSegments = pathname ? pathname.split("/").filter(Boolean) : []
            for (const s of currentSegments) {
                const stored = sessionStorage.getItem(`test-title-${s}`)
                if (stored) cached[s] = stored
            }
            if (Object.keys(cached).length > 0) {
                setDynamicTitles(prev => ({ ...prev, ...cached }))
            }
        } catch {}

        return () => window.removeEventListener("update-breadcrumb-title", handleUpdate)
    }, [pathname])

    // Don't show breadcrumbs on home page or top-level pages (2.3)
    if (pathname === "/" || segments.length <= 1) return null

    // Filter out skipped segments and build breadcrumbs
    const breadcrumbs = segments
        .filter(segment => !SKIP_SEGMENTS.includes(segment))
        .map((segment, index, filteredSegments) => {
            const href = "/" + filteredSegments.slice(0, index + 1).join("/")

            // If a dynamic title exists (e.g. test title), use it;
            // if segment is a raw ID (e.g. cuid), avoid raw ID in UI
            const isIdLike = /^(c[a-z0-9]{20,}|[0-9a-f-]{32,})$/i.test(segment)
            const dynamic = dynamicTitles[segment]
            const label = dynamic || ROUTE_LABELS[segment] || (isIdLike ? "Test" : segment
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "))

            return {
                href,
                label,
                isLast: index === filteredSegments.length - 1
            }
        })

    if (breadcrumbs.length === 0) return null

    return (
        <nav aria-label="Breadcrumb" data-testid="breadcrumbs" className="hidden sm:flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 mb-4 overflow-x-auto whitespace-nowrap min-h-[36px] max-h-[40px] py-1 leading-normal">
            <Link
                href={homeHref}
                className="hover:text-[#1448d8] dark:hover:text-[#1448d8] transition-colors flex items-center gap-1.5 p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"
                title="Home"
            >
                <Home className="h-3.5 w-3.5" />
                <span>Dashboard</span>
            </Link>

            {breadcrumbs.map((crumb, idx) => {
                // On mobile, hide middle breadcrumbs if more than 2
                const isMobileHidden = breadcrumbs.length > 2 && idx > 0 && !crumb.isLast

                return (
                    <div
                        key={crumb.href}
                        className={`flex items-center space-x-1.5 ${isMobileHidden ? "hidden sm:flex" : "flex"}`}
                    >
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                        {crumb.isLast ? (
                            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                                {crumb.label}
                            </span>
                        ) : (
                            <Link
                                href={crumb.href}
                                className="hover:text-[#1448d8] dark:hover:text-[#1448d8] transition-colors truncate max-w-[140px]"
                            >
                                {crumb.label}
                            </Link>
                        )}
                    </div>
                )
            })}
        </nav>
    )
}
