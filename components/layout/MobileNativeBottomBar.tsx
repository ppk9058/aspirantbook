"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ClipboardList, BookOpen, Zap } from "lucide-react"

interface MobileNativeBottomBarProps {
    hasActivePass?: boolean
}

export default function MobileNativeBottomBar({ hasActivePass }: MobileNativeBottomBarProps) {
    const pathname = usePathname()

    // 1. Hide completely on full-screen flows:
    // - Test attempt: /test-series/[id]/attempt, /assessments/[id]/take
    // - Video watch: /courses/[slug]/learn/[lessonId], /learn/[courseSlug]/[lessonId]
    const isFullScreenAttempt = Boolean(
        pathname && (
            pathname.includes("/attempt") ||
            pathname.includes("/take") ||
            pathname.startsWith("/test-execution")
        )
    )

    const isFullScreenVideoWatch = Boolean(
        pathname && (
            (pathname.startsWith("/courses/") && pathname.includes("/learn/")) ||
            pathname.startsWith("/learn/")
        )
    )

    if (isFullScreenAttempt || isFullScreenVideoWatch) {
        return null
    }

    // Determine active tab based on route hierarchy
    const isHomeActive = pathname === "/" || pathname === "/dashboard"
    const isTestsActive = Boolean(
        pathname && (
            pathname.startsWith("/test-series") ||
            pathname.startsWith("/my-tests") ||
            pathname.startsWith("/assessments") ||
            pathname.startsWith("/pyqs") ||
            pathname.startsWith("/current-affairs-quizzes")
        )
    )
    const isCoursesActive = Boolean(
        pathname && (
            (pathname.startsWith("/courses") && !isHomeActive) ||
            pathname.startsWith("/tutorials") ||
            pathname.startsWith("/tracks") ||
            pathname.startsWith("/batches")
        )
    )
    const isPassActive = Boolean(
        pathname && (
            pathname.startsWith("/subscription") ||
            pathname.startsWith("/pricing") ||
            pathname.startsWith("/checkout")
        )
    )

    const tabs = [
        {
            name: "Home",
            href: "/dashboard",
            icon: Home,
            isActive: isHomeActive,
        },
        {
            name: "Tests",
            href: "/test-series",
            icon: ClipboardList,
            isActive: isTestsActive,
        },
        {
            name: "Courses",
            href: "/courses",
            icon: BookOpen,
            isActive: isCoursesActive,
        },
        {
            name: "Pass",
            href: hasActivePass ? "/subscription" : "/pricing",
            icon: Zap,
            isActive: isPassActive,
            badge: hasActivePass ? "ACTIVE" : undefined,
        },
    ]

    return (
        <nav
            aria-label="Mobile Bottom Navigation"
            data-mobile-bottom-nav="true"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none safe-area-bottom w-full max-w-full overflow-hidden"
        >
            <div className="flex items-center justify-around h-15 px-1 sm:px-2 min-w-0 max-w-full">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const active = tab.isActive

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            prefetch={true}
                            aria-current={active ? "page" : undefined}
                            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:rounded-lg min-w-0 ${
                                active
                                    ? "text-teal-700 dark:text-teal-400 font-extrabold"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                            }`}
                        >
                            <div className="relative">
                                <Icon
                                    className={`h-5 w-5 transition-transform ${
                                        active ? "stroke-[2.5] scale-110" : "stroke-[1.75]"
                                    }`}
                                />
                                {tab.badge && (
                                    <span className="absolute -top-1 -right-1 text-[8px] font-black px-1 rounded-full bg-emerald-700 text-white leading-tight">
                                        {tab.badge}
                                    </span>
                                )}
                                {active && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-teal-700 dark:bg-teal-400 rounded-full"
                                    />
                                )}
                            </div>
                            <span className="mt-1 text-[10px] sm:text-[11px] tracking-tight truncate">{tab.name}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
