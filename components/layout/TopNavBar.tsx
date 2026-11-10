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
import BrandLogoLink from "@/components/layout/BrandLogoLink"
import ProfileDropdown from "@/components/layout/ProfileDropdown"

export default function TopNavBar() {
    const { data: session, status } = useSession()
    const { theme, toggleTheme } = useTheme()
    const { selectedGoal } = useGoal()
    const { openMobileAuth } = useMobileAuth()
    const router = useRouter()
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)

    return (
        <header className="fixed top-0 left-0 right-0 h-[60px] bg-white/95 dark:bg-[#05192D]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-50 transition-colors">
            <div className="h-full px-2 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
                {/* Logo & Goal Context Selector */}
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                    <BrandLogoLink />

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
                            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1448d8] focus:border-transparent transition-all"
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

                    {/* Notifications — desktop only. Below lg the same feature
                        lives in the avatar dropdown (ProfileDropdown) so the
                        phone header can show the full brand wordmark. */}
                    <div className="relative hidden lg:block">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Notifications"
                        >
                            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#0a2540] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                                </div>
                                <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                                    No new notifications
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown or Guest Login */}
                    <ProfileDropdown hideMyPurchase={false} />
                </div>
            </div>
            {/* PW-Style Select Your Goal Modal */}
            <GoalModal />
        </header>
    )
}
