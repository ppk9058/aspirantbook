"use client"

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
}

// Segments to skip in breadcrumbs (no dedicated page)
const SKIP_SEGMENTS = ["tracks"]

export default function Breadcrumbs() {
    const pathname = usePathname()
    const homeHref = "/dashboard"

    // Don't show breadcrumbs on home page
    if (pathname === "/") return null

    const segments = pathname.split("/").filter(Boolean)

    // Filter out skipped segments and build breadcrumbs
    const breadcrumbs = segments
        .filter(segment => !SKIP_SEGMENTS.includes(segment))
        .map((segment, index, filteredSegments) => {
            const href = "/" + filteredSegments.slice(0, index + 1).join("/")

            const label = ROUTE_LABELS[segment] || segment
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")

            return {
                href,
                label,
                isLast: index === filteredSegments.length - 1
            }
        })

    if (breadcrumbs.length === 0) return null

    return (
        <nav aria-label="Breadcrumb" data-testid="breadcrumbs" className="hidden sm:flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 mb-4 overflow-x-auto whitespace-nowrap py-1">
            <Link
                href={homeHref}
                className="hover:text-[#3AAFA9] dark:hover:text-[#3AAFA9] transition-colors flex items-center gap-1.5 p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"
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
                                className="hover:text-[#3AAFA9] dark:hover:text-[#3AAFA9] transition-colors truncate max-w-[140px]"
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
