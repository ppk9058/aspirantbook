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
import { UnverifiedEmailBanner } from "@/components/auth/UnverifiedEmailBanner"

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
            // Demo role switching is a non-production affordance only.
            if (process.env.NODE_ENV === "production") return
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

    // Video watch pages (/learn/... or /courses/.../learn) have their own focused player layout
    const isVideoWatchPage = Boolean(
        pathname && (
            pathname.includes("/learn/") ||
            (pathname.startsWith("/courses/") && pathname.includes("/learn"))
        )
    )
    const isBooksPage = Boolean(pathname && pathname.startsWith("/books"))
    const isTutorialPage = Boolean(
        pathname && (pathname.startsWith("/tutorials/") && pathname !== "/tutorials")
    )

    const [isCollapsed, setIsCollapsed] = useState(false)
    const [overrideState, setOverrideState] = useState<boolean | null>(null)

    useEffect(() => {
        setOverrideState(null)
    }, [pathname])

    useEffect(() => {
        const updateState = () => {
            const saved = localStorage.getItem("ts_sidebar_collapsed")
            if (saved !== null) {
                setIsCollapsed(saved === "true")
            }
        }

        updateState()
        const handleToggle = () => {
            const saved = localStorage.getItem("ts_sidebar_collapsed")
            if (saved !== null) {
                const val = saved === "true"
                setIsCollapsed(val)
                setOverrideState(val)
            }
        }
        window.addEventListener("sidebar-toggle", handleToggle)
        return () => window.removeEventListener("sidebar-toggle", handleToggle)
    }, [])

    const effectiveSidebarCollapsed =
        overrideState !== null ? overrideState : (isTutorialPage || isCollapsed)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors w-full max-w-full overflow-x-hidden">
            {/* Header: Desktop always gets TopNavBar (>= 1024px); Mobile gets MobileAppHeader if flag on, else TopNavBar */}
            {!isVideoWatchPage && !isBooksPage && (
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

            {!isVideoWatchPage && <LeftSidebar />}

            {/* Bottom Nav: native 4-tab bar if active student, else legacy BottomNavBar */}
            {!isVideoWatchPage && (
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
                        : isBooksPage
                        ? effectiveSidebarCollapsed
                            ? "lg:ml-[68px] pt-0 pb-32 sm:pb-24 lg:pb-8 px-0"
                            : "lg:ml-[240px] pt-0 pb-32 sm:pb-24 lg:pb-8 px-0"
                        : isTutorialPage
                        ? effectiveSidebarCollapsed
                            ? "lg:ml-[68px] pt-[60px] pb-36 sm:pb-28 lg:pb-12 px-0"
                            : "lg:ml-[240px] pt-[60px] pb-36 sm:pb-28 lg:pb-12 px-0"
                        : effectiveSidebarCollapsed
                        ? "lg:ml-[68px] pt-[60px] pb-36 sm:pb-28 lg:pb-12 px-4 sm:px-6 lg:px-8"
                        : "lg:ml-[240px] pt-[60px] pb-36 sm:pb-28 lg:pb-12 px-4 sm:px-6 lg:px-8"
                }`}
            >
                <div
                    className={
                        isBooksPage || isTutorialPage
                            ? "w-full max-w-full mx-auto"
                            : "max-w-7xl mx-auto space-y-6"
                    }
                >
                    <UnverifiedEmailBanner />
                    {!isBooksPage && (
                        isTutorialPage ? (
                            <div className="px-4 sm:px-6 lg:px-8 pt-2">
                                <Breadcrumbs />
                            </div>
                        ) : (
                            <Breadcrumbs />
                        )
                    )}
                    {children}
                </div>
            </main>

            {!isVideoWatchPage && <Chatbot />}
        </div>
    )
}
