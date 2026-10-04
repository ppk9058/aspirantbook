"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { safeSignOut } from "@/lib/auth-client"
import {
    Home,
    GraduationCap,
    Menu,
    ChevronRight,
    Shield,
    ChevronDown,
    User,
    Lock,
    Settings,
    LogOut,
    Sliders,
} from "lucide-react"
import RoleSwitcher from "@/components/common/RoleSwitcher"
import { AdminProfileDialog } from "./AdminProfileDialog"

interface AdminHeaderProps {
    user?: {
        name?: string | null
        email?: string | null
        image?: string | null
        role?: string | null
    }
}

// Map routes to human-friendly breadcrumbs
const routeNameMap: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/dashboard": "Dashboard",
    "/admin/courses": "Video Course Studio",
    "/admin/courses/new": "Create Video Course",
    "/admin/tutorials": "Tutorial Studio",
    "/admin/tutorials/new": "Create Tutorial",
    "/admin/homepage-cards": "HomePage Card Studio",
    "/admin/test-series": "Test Series Studio",
    "/admin/pyqs": "PYQ Studio",
    "/admin/batches": "Batches & Prep",
    "/admin/tracks": "Career Tracks",
    "/admin/tracks/create": "Create Track",
    "/admin/users": "Users & Access",
    "/admin/analytics": "Analytics",
    "/admin/audit": "Audit Logs",
    "/admin/settings": "System Settings",
}

export function AdminHeader({ user }: AdminHeaderProps) {
    const pathname = usePathname()
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)

    // Listen for external open dialog trigger (e.g. from AdminNav)
    useEffect(() => {
        const handleOpenDialog = () => setIsProfileDialogOpen(true)
        window.addEventListener("admin-open-profile-dialog", handleOpenDialog)
        return () => window.removeEventListener("admin-open-profile-dialog", handleOpenDialog)
    }, [])

    // Close dropdown on route change
    useEffect(() => {
        setShowProfileMenu(false)
    }, [pathname])

    // Generate readable page title / breadcrumbs
    const currentTitle = routeNameMap[pathname] || (
        pathname.startsWith("/admin/courses/") && pathname.endsWith("/edit")
            ? "Edit Course"
            : pathname.startsWith("/admin/batches/") && pathname.endsWith("/edit")
            ? "Edit Batch"
            : pathname.startsWith("/admin/users/")
            ? "User Details"
            : "Admin Console"
    )

    const toggleSidebar = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("admin-sidebar-toggle"))
        }
    }

    return (
        <>
            <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
                {/* Left: Mobile Toggle & Breadcrumbs */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 -ml-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 lg:hidden transition-colors"
                        aria-label="Toggle navigation menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-2 text-sm">
                        <Link
                            href="/admin/dashboard"
                            className="flex items-center gap-1.5 font-bold text-gray-900 hover:text-purple-600 transition-colors"
                        >
                            <Shield className="h-4 w-4 text-purple-600" />
                            <span className="hidden sm:inline">Admin Portal</span>
                        </Link>

                        <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />

                        <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full text-xs truncate max-w-[160px] sm:max-w-none">
                            {currentTitle}
                        </span>
                    </div>
                </div>

                {/* Right: Quick Home Navigation, Student Dashboard, Role Switcher & Profile Dropdown */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Home Page Link */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 text-xs font-bold transition-all shadow-2xs group"
                        title="Return to Public Home Page"
                    >
                        <Home className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span className="hidden md:inline">Home Page</span>
                        <span className="md:hidden">Home</span>
                    </Link>

                    {/* Learner Dashboard Link */}
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50/60 hover:bg-sky-100/70 text-sky-800 text-xs font-bold transition-all shadow-2xs group"
                        title="Switch to Student Dashboard"
                    >
                        <GraduationCap className="h-3.5 w-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
                        <span className="hidden lg:inline">Learner App</span>
                    </Link>

                    {/* Divider */}
                    <div className="h-5 w-px bg-gray-200 hidden sm:block" />

                    {/* Role Switcher */}
                    <RoleSwitcher />

                    {/* Interactive Profile & Settings Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                            aria-label="Admin account menu"
                            title="Admin profile, settings & logout"
                        >
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                                {user?.image ? (
                                    <img
                                        src={user.image}
                                        alt={user.name || "Admin"}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span>{(user?.name || user?.email || "A").slice(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="hidden xl:flex flex-col text-left">
                                <span className="text-xs font-bold text-gray-800 leading-tight truncate max-w-[100px]">
                                    {user?.name || "Admin Authority"}
                                </span>
                                <span className="text-[10px] text-purple-600 font-semibold leading-tight">
                                    Super Admin
                                </span>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 hidden sm:block opacity-70" />
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowProfileMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    {/* User Details Header */}
                                    <div className="px-4 py-3 border-b border-gray-100 bg-slate-50/70 rounded-t-xl -mt-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-bold text-gray-900 truncate">
                                                {user?.name || "Admin User"}
                                            </p>
                                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                                ADMIN
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                            {user?.email || "admin@aspirantbook.com"}
                                        </p>
                                    </div>

                                    {/* Action Links */}
                                    <div className="py-1.5 space-y-0.5">
                                        <button
                                            onClick={() => {
                                                setShowProfileMenu(false)
                                                setIsProfileDialogOpen(true)
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                                        >
                                            <User className="h-4 w-4 text-purple-600" />
                                            <span>Edit Admin Profile</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setShowProfileMenu(false)
                                                setIsProfileDialogOpen(true)
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                                        >
                                            <Lock className="h-4 w-4 text-purple-600" />
                                            <span>Change Password</span>
                                        </button>

                                        <Link
                                            href="/admin/settings"
                                            onClick={() => setShowProfileMenu(false)}
                                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                        >
                                            <Sliders className="h-4 w-4 text-purple-600" />
                                            <span>System Settings</span>
                                        </Link>

                                        <Link
                                            href="/settings"
                                            onClick={() => setShowProfileMenu(false)}
                                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                        >
                                            <Settings className="h-4 w-4 text-purple-600" />
                                            <span>Account Preferences</span>
                                        </Link>
                                    </div>

                                    {/* Sign Out Button */}
                                    <div className="border-t border-gray-100 pt-1.5 mt-1">
                                        <button
                                            onClick={() => safeSignOut("/")}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                                        >
                                            <LogOut className="h-4 w-4 text-red-500" />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Admin Profile & Password Edit Dialog */}
            <AdminProfileDialog
                isOpen={isProfileDialogOpen}
                onClose={() => setIsProfileDialogOpen(false)}
                initialUser={user}
            />
        </>
    )
}
