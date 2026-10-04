"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, Suspense } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import TopNavBar from "@/components/layout/TopNavBar"
import LeftSidebar from "@/components/layout/LeftSidebar"
import BottomNavBar from "@/components/layout/BottomNavBar"
import MobileAppHeader from "@/components/layout/MobileAppHeader"
import MobileNativeBottomBar from "@/components/layout/MobileNativeBottomBar"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { IS_MOBILE_NATIVE_SHELL_ENABLED } from "@/lib/config/mobile-shell"

const Chatbot = dynamic(
    () => import("@/components/layout/Chatbot").then((m) => m.Chatbot),
    { ssr: false }
)

export default function DashboardShell({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { data: session } = useSession()

    const [demoRole, setDemoRole] = useState<string | null>(null)

    useEffect(() => {
        try {
            const match = document.cookie.match(/(^|;)\s*ts_demo_role\s*=\s*([^;]+)/)
            if (match) setDemoRole(match[2])
        } catch {}
    }, [])

    const effectiveRole = session?.user?.role || demoRole || "STUDENT"
    // Pass and student status check - learners include FREE, PREMIUM, or STUDENT
    const isStudent = effectiveRole !== "TEACHER" && effectiveRole !== "ADMIN"
    const isMobileNativeActive = IS_MOBILE_NATIVE_SHELL_ENABLED && isStudent

    // Check pass status from session if available
    const hasActivePass =
        session?.user?.subscriptionStatus === "ACTIVE" ||
        effectiveRole === "PREMIUM" ||
        (session?.user as any)?.role === "PREMIUM"

    // Completely hide leftsidebar on video course pages to prevent distraction
    const isVideoCoursePage = Boolean(
        pathname && (
            (pathname.startsWith("/courses/") && pathname !== "/courses") ||
            pathname.startsWith("/learn")
        )
    )
    const isVideoWatchPage = Boolean(
        pathname && (
            pathname.includes("/learn/") ||
            (pathname.startsWith("/courses/") && pathname.includes("/learn"))
        )
    )
    const isBooksPage = Boolean(pathname && pathname.startsWith("/books"))

    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
        const updateState = () => {
            const saved = localStorage.getItem("ts_sidebar_collapsed")
            setIsCollapsed(saved === "true")
        }

        updateState()
        window.addEventListener("sidebar-toggle", updateState)
        return () => window.removeEventListener("sidebar-toggle", updateState)
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
            {/* Header: Desktop always gets TopNavBar (>= 1024px); Mobile gets MobileAppHeader if flag on, else TopNavBar */}
            {!isVideoWatchPage && !isBooksPage && !isVideoCoursePage && (
                <>
                    {/* Desktop header: exactly as before */}
                    <div className="hidden lg:block">
                        <TopNavBar />
                    </div>

                    {/* Mobile header: native app header when flag is active, else legacy TopNavBar */}
                    <div className="block lg:hidden">
                        {isMobileNativeActive ? (
                            <MobileAppHeader hasActivePass={hasActivePass} />
                        ) : (
                            <TopNavBar />
                        )}
                    </div>
                </>
            )}

            {!isVideoCoursePage && <LeftSidebar />}

            {/* Bottom Nav: native 4-tab bar if active student, else legacy BottomNavBar */}
            {!isVideoCoursePage && (
                isMobileNativeActive ? (
                    <MobileNativeBottomBar hasActivePass={hasActivePass} />
                ) : (
                    <BottomNavBar />
                )
            )}

            <main
                className={`transition-all duration-300 ${
                    isVideoWatchPage
                        ? "lg:ml-0 p-0"
                        : isVideoCoursePage
                        ? "lg:ml-0 pt-0 p-0"
                        : isBooksPage
                        ? isCollapsed
                            ? "lg:ml-[68px] pt-0 pb-32 sm:pb-24 lg:pb-8 px-0"
                            : "lg:ml-[240px] pt-0 pb-32 sm:pb-24 lg:pb-8 px-0"
                        : isCollapsed
                        ? "lg:ml-[68px] pt-[60px] pb-36 sm:pb-28 lg:pb-12 px-4 sm:px-6 lg:px-8"
                        : "lg:ml-[240px] pt-[60px] pb-36 sm:pb-28 lg:pb-12 px-4 sm:px-6 lg:px-8"
                }`}
            >
                <div className={isVideoCoursePage || isBooksPage ? "w-full mx-auto" : "max-w-7xl mx-auto space-y-6"}>
                    {!isVideoCoursePage && !isBooksPage && <Breadcrumbs />}
                    <Suspense
                        fallback={
                            <div className="space-y-6 animate-pulse py-4">
                                <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
                                <div className="h-44 bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
                            </div>
                        }
                    >
                        {children}
                    </Suspense>
                </div>
            </main>

            {!isVideoWatchPage && !isVideoCoursePage && <Chatbot />}
        </div>
    )
}
