"use client"

import Link from "next/link"
import { Search, Bell, User, Settings, LogOut, Sun, Moon, ShoppingBag } from "lucide-react"
import { useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { safeSignOut } from "@/lib/auth-client"
import { useTheme } from "@/components/providers/ThemeProvider"
import RoleSwitcher from "@/components/common/RoleSwitcher"

import GoalSelectorButton from "@/components/layout/GoalSelectorButton"
import { useGoal } from "@/components/providers/GoalProvider"

import GoalModal from "@/components/layout/GoalModal"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { getDashboardHref } from "@/lib/auth/roles"

export default function TopNavBar() {
    const { data: session, status } = useSession()
    const { theme, toggleTheme } = useTheme()
    const { selectedGoal } = useGoal()
    const { openMobileAuth } = useMobileAuth()
    const router = useRouter()
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)

    const homeHref = getDashboardHref(session?.user?.role, !!session?.user)

    return (
        <header className="fixed top-0 left-0 right-0 h-[60px] bg-white/95 dark:bg-[#05192D]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-50 transition-colors">
            <div className="h-full px-2 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
                {/* Logo & Goal Context Selector */}
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                    <Link href={homeHref} data-testid="brand-logo" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#3AAFA9] to-[#1DB954] rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-base sm:text-lg">T</span>
                        </div>
                        <span data-testid="brand-name" className="text-xl font-bold text-[#05192D] dark:text-white tracking-tight hidden md:inline">aspirantbook</span>
                    </Link>

                    {/* Persistent PW-style Goal Switcher */}
                    <GoalSelectorButton />
                </div>

                {/* Search Bar - hidden on very small screens, responsive */}
                <div className="hidden sm:block flex-1 max-w-xl mx-4 lg:mx-8">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            const query = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value
                            if (query.trim()) {
                                router.push(`/search?q=${encodeURIComponent(query)}`)
                            }
                        }}
                        className="relative"
                    >
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            name="q"
                            type="text"
                            placeholder={`Search for '${selectedGoal.name}' courses, tests, notes... (Cmd+K)`}
                            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] focus:border-transparent transition-all"
                        />
                    </form>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
                    {/* Interactive Role Switcher - ADMIN ONLY */}
                    {session?.user?.role === "ADMIN" && <RoleSwitcher />}

                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? (
                            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                        ) : (
                            <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        )}
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Notifications"
                        >
                            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 bg-[#EF4444] rounded-full ring-2 ring-white dark:ring-[#05192D]" />
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#0a2540] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                                    <span className="text-xs text-[#3AAFA9] font-medium cursor-pointer">Mark all read</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Welcome to aspirantbook!</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Start with your first interactive lesson today.</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Just now</p>
                                    </div>
                                    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Daily Streak Challenge</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Keep learning today to maintain your streak!</p>
                                        <p className="text-[10px] text-gray-400 mt-1">3 hours ago</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown or Guest Login */}
                    {status === "loading" ? (
                        <div className="flex items-center gap-2 p-1 sm:p-1.5" aria-label="Loading profile skeleton">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                            <div className="hidden md:flex flex-col gap-1 text-left">
                                <div className="w-16 h-2.5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                                <div className="w-10 h-2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                            </div>
                        </div>
                    ) : session?.user ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                aria-label="User menu"
                            >
                                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#3AAFA9] to-[#1DB954] rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                                    {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div className="hidden md:flex flex-col text-left">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight">
                                        {session.user.name || session.user.email?.split("@")[0] || "Learner"}
                                    </span>
                                    <span className="text-[10px] text-gray-500 capitalize leading-tight">
                                        {session.user.role === "ADMIN" ? "Admin" : session.user.role === "TEACHER" ? "Teacher" : "Student"}
                                    </span>
                                </div>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0a2540] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50">
                                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                {session.user.name || "Learner"}
                                            </p>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                {session.user.role === "ADMIN" ? "Admin" : session.user.role === "TEACHER" ? "Teacher" : "Student"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{session.user.email}</p>
                                    </div>
                                    <Link
                                        href="/profile"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span>My Profile</span>
                                    </Link>
                                    <Link
                                        href="/purchases"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors font-semibold"
                                    >
                                        <ShoppingBag className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                        <span>My Purchase</span>
                                    </Link>
                                    <Link
                                        href="/settings"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <Settings className="h-4 w-4 text-gray-400" />
                                        <span>Settings</span>
                                    </Link>
                                    <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                    <button
                                        onClick={() => safeSignOut("/")}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => openMobileAuth({ actionType: "login" })}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                            Login / Register
                        </button>
                    )}
                </div>
            </div>
            {/* PW-Style Select Your Goal Modal */}
            <GoalModal />
        </header>
    )
}
