"use client"

import Link from "next/link"
import {
    X,
    User,
    Settings,
    LogOut,
    Sun,
    Moon,
    Zap,
    ChevronRight,
    Award,
    CreditCard,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { safeSignOut } from "@/lib/auth-client"
import { useTheme } from "@/components/providers/ThemeProvider"
import { SHOW_PREMIUM_PLAN } from "@/lib/config/premium"
import NotificationsMenu from "@/components/layout/NotificationsMenu"

interface MobileProfileSheetProps {
    isOpen: boolean
    onClose: () => void
    hasActivePass?: boolean
}

export default function MobileProfileSheet({ isOpen, onClose, hasActivePass }: MobileProfileSheetProps) {
    const { data: session, status } = useSession()
    const { theme, toggleTheme } = useTheme()

    if (!isOpen) return null

    const user = session?.user

    return (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Account Profile Menu">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-out Sheet Panel from Right */}
            <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                        Account & Profile
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close profile menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Student Profile Card (shifted from hamburger menu) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    {status === "loading" ? (
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
                            </div>
                        </div>
                    ) : user ? (
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-extrabold text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                                {user.name?.[0]?.toUpperCase() || "A"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                                    {user.name || "Aspirant"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {user.email}
                                </p>
                                {Boolean((user as any).phoneNumber) && (
                                    <p className="text-[11px] font-semibold text-slate-400 truncate">
                                        +91 {(user as any).phoneNumber}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                You are exploring as a guest learner
                            </p>
                            <Link
                                href="/login"
                                onClick={onClose}
                                className="block w-full text-center py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
                            >
                                Sign In / Register →
                            </Link>
                        </div>
                    )}

                    {/* Pass Upgrade / Pro Badge */}
                    {SHOW_PREMIUM_PLAN && (
                        <div className="mt-3">
                            <Link
                                href={hasActivePass ? "/subscription" : "/pricing"}
                                onClick={onClose}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-transform active:scale-95 ${
                                    hasActivePass
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                        : "bg-teal-600 text-white shadow-xs hover:bg-teal-700"
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Zap className="h-3.5 w-3.5 fill-current" />
                                    {hasActivePass ? "Pass Active (Pro Access)" : "Upgrade with Pass"}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </div>

                {/* Account Navigation Links */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        My Account
                    </p>
                    <Link
                        href="/profile"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <User className="h-4 w-4 text-slate-400" />
                        <span>My Profile & Learning Stats</span>
                    </Link>
                    <Link
                        href="/subscription"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        <span>Subscription & Payments</span>
                    </Link>

                    {/* Notifications moved here from the header bell so the full
                        brand wordmark always fits at 320px. Real unread count only. */}
                    <NotificationsMenu
                        onNavigate={onClose}
                        buttonClassName="flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    />

                    <Link
                        href="/settings"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Account Settings</span>
                    </Link>
                </div>

                {/* Footer: Theme Toggle & Logout */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between safe-area-bottom">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                    </button>

                    {user && (
                        <button
                            onClick={() => safeSignOut()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
