"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, Search, Bell } from "lucide-react"
import { useSession } from "next-auth/react"
import MobileDrawer from "@/components/layout/MobileDrawer"
import MobileProfileSheet from "@/components/layout/MobileProfileSheet"

interface MobileAppHeaderProps {
    hasActivePass?: boolean
}

export default function MobileAppHeader({ hasActivePass }: MobileAppHeaderProps) {
    const { data: session } = useSession()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    // Language switcher wired to real localStorage preference
    const [contentLang, setContentLang] = useState<"EN" | "HI">("EN")

    useEffect(() => {
        try {
            const savedLang = localStorage.getItem("ts_content_language")
            if (savedLang === "HI" || savedLang === "EN") {
                setContentLang(savedLang)
            }
        } catch {}
    }, [])

    const toggleLanguage = () => {
        const next = contentLang === "EN" ? "HI" : "EN"
        setContentLang(next)
        try {
            localStorage.setItem("ts_content_language", next)
            window.dispatchEvent(new CustomEvent("ts_language_change", { detail: { language: next } }))
        } catch {}
    }

    return (
        <>
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-50 transition-colors select-none">
                <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2">
                    {/* Left: Hamburger Menu & Brand Logo */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            aria-label="Open navigation menu"
                            className="p-2 -ml-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        <Link href="/dashboard" className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg">
                            <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-xs">
                                <span className="text-white font-extrabold text-sm">T</span>
                            </div>
                            <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                                aspirant<span className="text-teal-700 dark:text-teal-400">book</span>
                            </span>
                        </Link>
                    </div>

                    {/* Right Controls: Search, Notifications, Avatar */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Search Icon */}
                        <Link
                            href="/search"
                            aria-label="Search courses, test series, notes"
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                        >
                            <Search className="h-5 w-5" />
                        </Link>

                        {/* Notification Bell */}
                        <Link
                            href="/dashboard"
                            aria-label="Notifications"
                            className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                        </Link>

                        {/* Top-Right Avatar opens dedicated Profile & Account Sheet */}
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            aria-label="Account profile"
                            className="ml-1 p-0.5 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 active:scale-95 transition-transform"
                        >
                            <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-extrabold text-xs flex items-center justify-center">
                                {session?.user?.name?.[0]?.toUpperCase() || "A"}
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Platform Navigation Drawer (Left Hamburger) */}
            <MobileDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                hasActivePass={hasActivePass}
            />

            {/* Dedicated Profile & Account Sheet (Top-Right Avatar) */}
            <MobileProfileSheet
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                hasActivePass={hasActivePass}
            />
        </>
    )
}
