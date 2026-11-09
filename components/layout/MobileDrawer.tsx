"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    X,
    Home,
    BookOpen,
    ClipboardList,
    Layers,
    Book,
    FileText,
    Newspaper,
    GraduationCap,
    Code2,
    PlayCircle,
    User,
    Settings,
    LogOut,
    Sun,
    Moon,
    Zap,
    ChevronRight,
    ClipboardCheck,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { safeSignOut } from "@/lib/auth-client"
import { useTheme } from "@/components/providers/ThemeProvider"
import GoalSelectorButton from "@/components/layout/GoalSelectorButton"
import BrandLogo from "@/components/brand/BrandLogo"

import { getDashboardHref } from "@/lib/auth/roles"

interface MobileDrawerProps {
    isOpen: boolean
    onClose: () => void
    hasActivePass?: boolean
}

export default function MobileDrawer({ isOpen, onClose, hasActivePass }: MobileDrawerProps) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { theme, toggleTheme } = useTheme()

    if (!isOpen) return null

    const homeHref = getDashboardHref(session?.user?.role, !!session?.user)

    // Exact accessible list of items covering old tabs (Book, My Batches, Profile) + full sections
    const drawerNavItems = [
        { name: "Dashboard", href: "/dashboard", icon: Home, section: "main", testId: "mobile-drawer-dashboard" },
        { name: "My Batches & Enrollments", href: "/my-learning", icon: Layers, section: "main", badge: "Enrolled", testId: "mobile-drawer-learning" },
        { name: "Online Bookstore", href: "/books", icon: Book, section: "main", testId: "mobile-drawer-books" },
        { name: "Test Series & Mocks", href: "/test-series", icon: ClipboardList, section: "explore", testId: "mobile-drawer-test-series" },
        { name: "My Test", href: "/my-tests", icon: ClipboardCheck, section: "explore", badge: "Active", testId: "mobile-drawer-my-tests" },
        { name: "Video Courses", href: "/courses", icon: BookOpen, section: "explore", testId: "mobile-drawer-courses" },
        { name: "Previous Year Papers (PYQs)", href: "/pyqs", icon: FileText, section: "explore", testId: "mobile-drawer-pyqs" },
        { name: "Current Affairs & Quizzes", href: "/current-affairs-quizzes", icon: Newspaper, section: "explore", testId: "mobile-drawer-current-affairs" },
        { name: "Tutorials & Articles", href: "/tutorials", icon: GraduationCap, section: "explore", testId: "mobile-drawer-tutorials" },
        { name: "Coding Practice", href: "/practice", icon: Code2, section: "explore", testId: "mobile-drawer-practice" },
    ]

    return (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-out Drawer Panel */}
            <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800">
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <BrandLogo
                        size="md"
                        href={homeHref}
                        onClick={onClose}
                        data-testid="drawer-logo"
                    />

                    <button
                        onClick={onClose}
                        data-testid="drawer-close"
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drawer Goal Context Selector */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Goal</span>
                    <GoalSelectorButton />
                </div>

                {/* Nav Links */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Primary Navigation
                    </p>
                    {drawerNavItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || (item.href === "/my-tests" && pathname === "/test-series/my-tests")
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                data-testid={item.testId}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                                    isActive
                                        ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-teal-500" />
                                    <span>{item.name}</span>
                                </div>
                                {item.badge && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}

                </div>

                {/* Footer: Theme Toggle */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between safe-area-bottom">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
