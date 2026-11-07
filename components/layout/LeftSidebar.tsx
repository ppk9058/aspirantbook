"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Home,
    Compass,
    BookOpen,
    PlayCircle,
    PanelLeftClose,
    PanelLeftOpen,
    HelpCircle,
    Calendar,
    Users,
    Layers,
    Shield,
    CreditCard,
    User,
    ClipboardList,
    PencilRuler,
    Code2,
    FileText,
    FolderKanban,
    Video,
    Book,
    GraduationCap,
    Newspaper,
    ClipboardCheck,
    Sparkles,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { AppRole, getDashboardHref } from "@/lib/auth/roles"
import BrandLogoLink from "@/components/layout/BrandLogoLink"
import { isBooksRoute } from "@/components/layout/layout-utils"

const TEACHER_NAV = [
    { name: "Teacher Dashboard", href: "/teacher", icon: Home },
    { name: "Video Courses Studio", href: "/teacher/courses", icon: Video },
    { name: "Test Series Studio", href: "/teacher/test-series", icon: PencilRuler },
    { name: "Current Affairs & Quizzes", href: "/current-affairs-quizzes", icon: Newspaper },
    { name: "PYQ Studio", href: "/teacher/pyqs", icon: FileText },
    { name: "Tutorial Studio", href: "/teacher/tutorials", icon: BookOpen },
    { name: "Batches & Prep", href: "/teacher/batches", icon: Layers },
    { name: "Book", href: "/books", icon: Book },
    { name: "My Classes", href: "/teacher/classes", icon: Calendar },
    { name: "Pending Doubts", href: "/teacher/questions", icon: HelpCircle },
    { name: "Profile", href: "/profile", icon: User },
]

const ADMIN_NAV = [
    { name: "Admin Control", href: "/admin", icon: Home },
    { name: "Video Courses Studio", href: "/admin/courses", icon: Video },
    { name: "Test Series Studio", href: "/admin/test-series", icon: PencilRuler },
    { name: "Current Affairs & Quizzes", href: "/current-affairs-quizzes", icon: Newspaper },
    { name: "PYQ Studio", href: "/admin/pyqs", icon: FileText },
    { name: "Content Engine", href: "/admin/content-engine", icon: Sparkles },
    { name: "Tutorial Studio", href: "/admin/tutorials", icon: BookOpen },
    { name: "Batches & Prep", href: "/admin/batches", icon: Layers },
    { name: "Online Bookstore", href: "/admin/books", icon: Book },
    { name: "User Management", href: "/admin/users", icon: Users },
    { name: "Audit Logs", href: "/admin/audit", icon: Shield },
    { name: "Profile", href: "/profile", icon: User },
]

export default function LeftSidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()

    // Auto-collapse sidebar ONLY on tutorial reading pages (/tutorials/<slug>)
    const isTutorialPage = Boolean(
        pathname && (pathname.startsWith("/tutorials/") && pathname !== "/tutorials")
    )
    const isBooksPage = isBooksRoute(pathname)

    const [isCollapsed, setIsCollapsed] = useState(false)
    const [overrideState, setOverrideState] = useState<boolean | null>(null)

    // Reset manual toggle override on page change so course pages auto-collapse fresh
    useEffect(() => {
        setOverrideState(null)
    }, [pathname])

    // Derive active role strictly from authentic session role or active section
    const rawRole = session?.user?.role
    let activeRole: AppRole = "STUDENT"
    if (rawRole === "ADMIN") {
        activeRole = pathname.startsWith("/teacher") ? "TEACHER" : "ADMIN"
    } else if (rawRole === "TEACHER" || pathname.startsWith("/teacher")) {
        activeRole = "TEACHER"
    } else {
        activeRole = "STUDENT"
    }

    const homeHref = getDashboardHref(session?.user?.role, !!session?.user)

    const studentNav = useMemo(() => {
        return [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Courses", href: "/courses", icon: BookOpen },
            { name: "Book", href: "/books", icon: Book },
            { name: "My Batches & enrollment", href: "/my-learning", icon: Compass },
            { name: "Current Affairs and Quizzes", href: "/current-affairs-quizzes", icon: Newspaper },
            { name: "Tutorial", href: "/tutorials", icon: GraduationCap },
            { name: "Test Series", href: "/test-series", icon: ClipboardList },
            { name: "My Test", href: "/my-tests", icon: ClipboardCheck },
            { name: "Previous Year Questions", href: "/pyqs", icon: FileText },
            { name: "Coding Practice", href: "/practice", icon: Code2 },
            { name: "Payments", href: "/subscription", icon: CreditCard },
            { name: "Profile", href: "/profile", icon: User },
        ]
    }, [])

    useEffect(() => {
        const updateState = () => {
            const saved = localStorage.getItem("ts_sidebar_collapsed")
            if (saved !== null) {
                setIsCollapsed(saved === "true")
            }
        }
        updateState()
        window.addEventListener("sidebar-toggle", updateState)
        return () => window.removeEventListener("sidebar-toggle", updateState)
    }, [])

    const effectiveCollapsed = overrideState !== null ? overrideState : (isTutorialPage || isCollapsed)

    const navigation = activeRole === "ADMIN" ? ADMIN_NAV : activeRole === "TEACHER" ? TEACHER_NAV : studentNav

    const toggleCollapse = () => {
        const nextState = !effectiveCollapsed
        setOverrideState(nextState)
        setIsCollapsed(nextState)
        localStorage.setItem("ts_sidebar_collapsed", String(nextState))
        window.dispatchEvent(new Event("sidebar-toggle"))
    }

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/"
        if (href === "/dashboard") return pathname === "/dashboard"
        if (href === "/teacher") return pathname === "/teacher"
        if (href === "/courses") return pathname === "/courses"
        if (href === "/my-tests") return pathname === "/my-tests" || pathname === "/test-series/my-tests"
        if (href === "/test-series") return pathname === "/test-series" || (pathname.startsWith("/test-series") && !pathname.includes("/my-tests"))
        return pathname.startsWith(href)
    }

    return (
        <aside
            className={`hidden lg:flex flex-col fixed left-0 ${
                isBooksPage ? "top-0 h-screen" : "top-[60px] h-[calc(100vh-60px)]"
            } ${
                effectiveCollapsed ? "w-[68px]" : "w-[240px]"
            } bg-white dark:bg-[#030f1d] text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-30`}
        >
            {/* Header: Brand Logo on /books routes where TopNavBar is suppressed */}
            {isBooksPage && (
                <div
                    className={`h-[60px] flex items-center ${
                        effectiveCollapsed ? "justify-center px-2" : "px-4"
                    } border-b border-gray-200 dark:border-gray-800 shrink-0`}
                >
                    <BrandLogoLink collapsed={effectiveCollapsed} />
                </div>
            )}

            {/* Header: Collapse Toggle */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200/80 dark:border-gray-800/80">
                {!effectiveCollapsed && (
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-400">Navigation</span>
                )}
                <button
                    onClick={toggleCollapse}
                    className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors ${
                        effectiveCollapsed ? "mx-auto" : ""
                    }`}
                    title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label="Toggle sidebar width"
                >
                    {effectiveCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
                {navigation.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            prefetch={true}
                            data-testid={`sidebar-item-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                            className={`flex items-center ${
                                effectiveCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
                            } text-xs font-semibold rounded-xl transition-all ${
                                active
                                    ? "bg-[#1448d8] text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                            }`}
                            title={effectiveCollapsed ? item.name : undefined}
                        >
                            <Icon className={`h-4 w-4 ${active ? "stroke-[2.5]" : "stroke-[2]"}`} />
                            {!effectiveCollapsed && <span>{item.name}</span>}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}
