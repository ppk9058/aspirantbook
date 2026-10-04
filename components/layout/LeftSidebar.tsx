"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Home,
    Compass,
    BookOpen,
    PlayCircle,
    Target,
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
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { AppRole } from "@/lib/auth/roles"

const TEACHER_NAV = [
    { name: "Teacher Dashboard", href: "/teacher", icon: Home },
    { name: "Video Courses Studio", href: "/admin/courses", icon: Video },
    { name: "Test Series Studio", href: "/admin/test-series", icon: PencilRuler },
    { name: "Current Affairs & Quizzes", href: "/current-affairs-quizzes", icon: Newspaper },
    { name: "PYQ Studio", href: "/admin/pyqs", icon: FileText },
    { name: "Tutorial Studio", href: "/admin/tutorials", icon: BookOpen },
    { name: "Book", href: "/books", icon: Book },
    { name: "My Classes", href: "/teacher/classes", icon: Calendar },
    { name: "Live Studio", href: "/classroom/half-yearly-6?role=teacher", icon: PlayCircle },
    { name: "Pending Doubts", href: "/teacher/questions", icon: HelpCircle },
    { name: "Profile", href: "/profile", icon: User },
]

const ADMIN_NAV = [
    { name: "Admin Control", href: "/admin", icon: Home },
    { name: "Video Courses Studio", href: "/admin/courses", icon: Video },
    { name: "Test Series Studio", href: "/admin/test-series", icon: PencilRuler },
    { name: "Current Affairs & Quizzes", href: "/current-affairs-quizzes", icon: Newspaper },
    { name: "PYQ Studio", href: "/admin/pyqs", icon: FileText },
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

    // Detect if we are on a course tutorial or learning studio page
    const isCourseStudio = Boolean(
        pathname && (
            (pathname.startsWith("/courses/") && pathname !== "/courses") ||
            pathname.startsWith("/learn/")
        )
    )

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

    const studentNav = useMemo(() => {
        return [
            { name: "Home", href: "/dashboard", icon: Home },
            { name: "Courses", href: "/courses", icon: BookOpen },
            { name: "Book", href: "/books", icon: Book },
            { name: "My Batches", href: "/my-learning", icon: Compass },
            { name: "Current Affairs and Quizzes", href: "/current-affairs-quizzes", icon: Newspaper },
            { name: "Tutorial", href: "/tutorials", icon: GraduationCap },
            { name: "Test Series", href: "/test-series", icon: ClipboardList },
            { name: "My Test", href: "/my-tests", icon: ClipboardCheck },
            { name: "Previous Year Questions", href: "/pyqs", icon: FileText },
            { name: "Coding Practice", href: "/practice", icon: Code2 },
            { name: "Live Classes", href: "/classroom/half-yearly-6", icon: PlayCircle },
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

    const effectiveCollapsed = overrideState !== null ? overrideState : (isCourseStudio || isCollapsed)

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
        if (href === "/courses") return pathname === "/courses"
        if (href === "/my-tests") return pathname === "/my-tests" || pathname === "/test-series/my-tests"
        if (href === "/test-series") return pathname === "/test-series" || (pathname.startsWith("/test-series") && !pathname.includes("/my-tests"))
        return pathname.startsWith(href)
    }

    return (
        <aside
            className={`hidden lg:flex flex-col fixed left-0 top-[60px] h-[calc(100vh-60px)] ${
                effectiveCollapsed ? "w-[68px]" : "w-[240px]"
            } bg-white dark:bg-[#030f1d] text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-30`}
        >
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
                            className={`flex items-center ${
                                effectiveCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
                            } text-xs font-semibold rounded-xl transition-all ${
                                active
                                    ? "bg-[#3AAFA9] text-white shadow-sm"
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

            {/* Footer Widget: Daily Goal / XP */}
            {!effectiveCollapsed && (
                <div className="p-3 m-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-xs">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
                            <Target className="h-3.5 w-3.5 text-[#1DB954]" />
                            Daily Goal
                        </span>
                        <span className="text-[#3AAFA9] font-bold">15 / 30m</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#3AAFA9] to-[#1DB954] w-1/2 rounded-full" />
                    </div>
                </div>
            )}
        </aside>
    )
}
