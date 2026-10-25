"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { safeSignOut } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { isTeacherAllowedAdminPath } from "@/lib/auth/roles"
import {
    LayoutDashboard,
    BookOpen,
    Users,
    BarChart3,
    Settings,
    Code2,
    GraduationCap,
    Shield,
    ArrowLeft,
    ArrowUpRight,
    X,
    FolderKanban,
    LogOut,
    UserCheck,
    FileText,
    Video,
    PencilRuler,
    Sparkles,
    Book,
    Globe,
} from "lucide-react"

interface AdminNavProps {
    user?: {
        name?: string | null
        email?: string | null
        image?: string | null
        role?: string | null
    }
}

// Admin management routes
const adminNavigation = [
    { icon: LayoutDashboard, name: "Dashboard", href: "/admin/dashboard", matchPrefix: "/admin/dashboard" },
    { icon: Video, name: "Video Course Studio", href: "/admin/courses", matchPrefix: "/admin/courses" },
    { icon: BookOpen, name: "Tutorial Studio", href: "/admin/tutorials", matchPrefix: "/admin/tutorials" },
    { icon: Sparkles, name: "HomePage Card Studio", href: "/admin/homepage-cards", matchPrefix: "/admin/homepage-cards" },
    { icon: PencilRuler, name: "Test Series Studio", href: "/admin/test-series", matchPrefix: "/admin/test-series" },
    { icon: FileText, name: "PYQ Studio", href: "/admin/pyqs", matchPrefix: "/admin/pyqs" },
    { icon: Sparkles, name: "Content Engine", href: "/admin/content-engine", matchPrefix: "/admin/content-engine", adminOnly: true },
    { icon: Globe, name: "SEO Audit", href: "/admin/seo", matchPrefix: "/admin/seo", adminOnly: true },
    { icon: BookOpen, name: "Book Studio", href: "/admin/book-studio", matchPrefix: "/admin/book-studio" },
    { icon: Book, name: "Online Bookstore", href: "/admin/books", matchPrefix: "/admin/books", adminOnly: true },
    { icon: GraduationCap, name: "Batches & Prep", href: "/admin/batches", matchPrefix: "/admin/batches" },
    { icon: FolderKanban, name: "Career Tracks", href: "/admin/tracks", matchPrefix: "/admin/tracks" },
    { icon: Users, name: "Users & Roles", href: "/admin/users", matchPrefix: "/admin/users" },
    { icon: BarChart3, name: "Analytics", href: "/admin/analytics", matchPrefix: "/admin/analytics" },
    { icon: Shield, name: "Audit Logs", href: "/admin/audit", matchPrefix: "/admin/audit" },
    { icon: Settings, name: "Settings", href: "/admin/settings", matchPrefix: "/admin/settings" },
]

export function AdminNav({ user: propUser }: AdminNavProps) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [isOpen, setIsOpen] = useState(false)

    const user = propUser || session?.user

    // Listen for mobile sidebar toggle event from AdminHeader
    useEffect(() => {
        const handleToggle = () => setIsOpen((prev) => !prev)
        window.addEventListener("admin-sidebar-toggle", handleToggle)
        return () => window.removeEventListener("admin-sidebar-toggle", handleToggle)
    }, [])

    // Close mobile drawer on route change
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    const isRouteActive = (item: (typeof adminNavigation)[0]) => {
        if (item.href === "/admin/dashboard") {
            return pathname === "/admin" || pathname === "/admin/dashboard"
        }
        const isTeacher = user?.role === "TEACHER"
        const prefix = isTeacher ? item.matchPrefix.replace("/admin/", "/teacher/") : item.matchPrefix
        return pathname.startsWith(prefix) || pathname.startsWith(item.matchPrefix)
    }

    const openProfileDialog = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("admin-open-profile-dialog"))
        }
    }

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    "w-64 bg-slate-900 text-gray-300 flex flex-col fixed inset-y-0 left-0 z-50 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 shadow-xl lg:shadow-none",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo & Platform Header - Clickable to Home or Teacher Dashboard */}
                <div className="p-4 flex items-center justify-between border-b border-slate-800">
                    <Link
                        href={user?.role === "TEACHER" ? "/teacher" : "/"}
                        className="flex items-center gap-3 group transition-transform active:scale-95"
                        title={user?.role === "TEACHER" ? "Return to Teacher Dashboard" : "Return to aspirantbook Home Page"}
                    >
                        <div className="h-9 w-9 bg-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:bg-purple-500 transition-colors flex-shrink-0">
                            <span className="text-white font-black text-base">A</span>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white flex items-center gap-1.5 group-hover:text-purple-300 transition-colors">
                                <span>{user?.role === "TEACHER" ? "Teacher Studio" : "Admin Portal"}</span>
                                <ArrowUpRight className="h-3.5 w-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs text-purple-400 font-medium">aspirantbook</div>
                        </div>
                    </Link>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 lg:hidden"
                        aria-label="Close navigation"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation Scrollable Body */}
                <div className="flex-1 overflow-y-auto py-4 px-3">
                    <nav className="space-y-1">
                        {adminNavigation
                            .filter((item) => {
                                if (user?.role === "TEACHER") {
                                    return isTeacherAllowedAdminPath(item.href)
                                }
                                return !(item as any).adminOnly || user?.role === "ADMIN"
                            })
                            .map((item) => {
                            const isTeacher = user?.role === "TEACHER"
                            const itemHref = isTeacher ? item.href.replace("/admin/", "/teacher/") : item.href
                            const active = isRouteActive(item)
                            return (
                                <Link
                                    key={item.name}
                                    href={itemHref}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        active
                                            ? "bg-purple-600 text-white font-semibold shadow-xs"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                    )}
                                >
                                    <item.icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-white" : "text-slate-400")} />
                                    <span className="truncate">{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Footer with Admin User Profile Card, Logout & Return to Home */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2.5">
                    {/* Admin User Profile Card */}
                    <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-2">
                        <button
                            onClick={openProfileDialog}
                            className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity cursor-pointer group flex-1"
                            title="Edit Profile & Password"
                        >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm overflow-hidden">
                                {user?.image ? (
                                    <img src={user.image} alt={user.name || "A"} className="h-full w-full object-cover" />
                                ) : (
                                    <span>{(user?.name || user?.email || "A").slice(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-200 truncate group-hover:text-purple-300 transition-colors">
                                    {user?.name || "Admin Authority"}
                                </div>
                                <div className="text-[10px] text-purple-400 font-medium truncate">
                                    {user?.email || (user?.role === "TEACHER" ? "Teacher" : "Super Admin")}
                                </div>
                            </div>
                        </button>

                        {/* Quick Action Icons: Edit Profile & Sign Out */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={openProfileDialog}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                                title="Edit Profile & Password"
                                aria-label="Edit Profile"
                            >
                                <Settings className="h-3.5 w-3.5" />
                            </button>

                            <button
                                onClick={() => safeSignOut("/")}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 transition-colors cursor-pointer"
                                title="Sign Out"
                                aria-label="Sign Out"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Dedicated Return to Home / Teacher Dashboard Button */}
                    <Link
                        href={user?.role === "TEACHER" ? "/teacher" : "/"}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-md group"
                        title={user?.role === "TEACHER" ? "Exit Studio and return to Teacher Dashboard" : "Exit Admin and return to Home Page"}
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        <span>{user?.role === "TEACHER" ? "Teacher Dashboard" : "Return to Home"}</span>
                    </Link>

                    {/* Status indicator */}
                    <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {user?.role === "TEACHER" ? "Teacher Mode" : "Admin Mode"}
                        </span>
                        <span className="text-[10px] text-slate-500">aspirantbook</span>
                    </div>
                </div>
            </aside>
        </>
    )
}
