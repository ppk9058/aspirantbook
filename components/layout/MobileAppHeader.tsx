"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, Search } from "lucide-react"
import { useSession } from "next-auth/react"
import MobileDrawer from "@/components/layout/MobileDrawer"
import MobileProfileSheet from "@/components/layout/MobileProfileSheet"
import { getDashboardHref } from "@/lib/auth/roles"
import { openMobileAuth } from "@/components/auth/MobileAuthModal"
import BrandLogo from "@/components/brand/BrandLogo"

interface MobileAppHeaderProps {
    hasActivePass?: boolean
}

export default function MobileAppHeader({ hasActivePass }: MobileAppHeaderProps) {
    const { data: session, status } = useSession()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    const homeHref = getDashboardHref(session?.user?.role, !!session?.user)

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
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-50 transition-colors select-none w-full max-w-full overflow-hidden">
                <div className="h-full px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 max-w-full">
                    {/* Left: Hamburger Menu & Brand Logo */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            aria-label="Open navigation menu"
                            className="p-1.5 sm:p-2 -ml-1 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 flex-shrink-0"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        <BrandLogo
                            size="sm"
                            href={homeHref}
                            wordmarkClassName="shrink-0 whitespace-nowrap"
                            data-testid="mobile-header-logo"
                        />
                    </div>

                    {/* Right Controls: Search & Avatar.
                        The notification bell moved into the avatar sheet
                        (MobileProfileSheet) so the full "AspirantBook" wordmark
                        always fits at 320px. */}
                    <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
                        {/* Search Icon */}
                        <Link
                            href="/search"
                            aria-label="Search courses, test series, notes"
                            className="p-1.5 sm:p-2 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                        >
                            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Link>

                        {/* Top-Right: Profile Avatar if logged-in, Login CTA if guest */}
                        {status === "loading" ? (
                            <div className="p-0.5 min-h-11 min-w-11 flex items-center justify-center rounded-full ring-1 ring-slate-200 dark:ring-slate-700 flex-shrink-0 animate-pulse" aria-label="Loading profile skeleton">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200 dark:bg-slate-700" />
                            </div>
                        ) : session?.user ? (
                            <button
                                onClick={() => setIsProfileOpen(true)}
                                aria-label="Account profile"
                                className="p-0.5 min-h-11 min-w-11 flex items-center justify-center rounded-full ring-1 ring-slate-200 dark:ring-slate-700 active:scale-95 transition-transform flex-shrink-0"
                            >
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-extrabold text-xs flex items-center justify-center">
                                    {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"}
                                </div>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => openMobileAuth({ actionType: "login" })}
                                className="px-2.5 py-1 min-h-11 flex items-center justify-center text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-lg shadow-2xs active:scale-95 transition-all gap-1 shrink-0"
                                aria-label="Login or Register"
                            >
                                <span>Login</span>
                            </button>
                        )}
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
