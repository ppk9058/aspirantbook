"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"

interface NotificationsMenuProps {
    /** Called after a notification link is followed (drawers/sheets close themselves). */
    onNavigate?: () => void
    /** Wrapper class, so each host can match its own menu surface. */
    className?: string
    /** Row-button class, so the sheet row and the dropdown row look native to their host. */
    buttonClassName?: string
}

/**
 * The single notification entry point for the avatar pop-downs.
 *
 * It replaces the standalone header bell that used to compete with the brand
 * wordmark for space at 320–390px. Same feature set, one implementation: the
 * list comes from the real `/api/v1/notifications` endpoint and the badge is the
 * real unread count (no placeholder dots).
 */
export default function NotificationsMenu({
    onNavigate,
    className = "",
    buttonClassName = "",
}: NotificationsMenuProps) {
    const [open, setOpen] = useState(false)
    const { items, unreadCount, loading, error, markAllRead, refresh } = useNotifications()

    return (
        <div className={`w-full ${className}`.trim()}>
            <button
                type="button"
                data-testid="notifications-menu-button"
                onClick={() => {
                    const next = !open
                    setOpen(next)
                    if (next) void markAllRead()
                }}
                aria-expanded={open}
                aria-label={
                    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
                }
                className={`w-full ${buttonClassName}`.trim()}
            >
                <Bell className="h-4 w-4 text-slate-400" />
                <span className="flex-1 text-left">Notifications</span>
                {unreadCount > 0 && (
                    <span
                        data-testid="notifications-unread-badge"
                        className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white"
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    data-testid="notifications-menu-panel"
                    className="mt-1 rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-800/40"
                >
                    {loading && (
                        <p className="px-2 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Loading notifications…
                        </p>
                    )}

                    {!loading && error && (
                        <div className="px-2 py-2">
                            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                {error}
                            </p>
                            <button
                                type="button"
                                onClick={() => void refresh()}
                                className="mt-1 text-[11px] font-bold text-teal-700 underline dark:text-teal-300"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!loading && !error && items.length === 0 && (
                        <p className="px-2 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            No notifications yet
                        </p>
                    )}

                    {!loading && !error && items.length > 0 && (
                        <>
                            <ul className="max-h-56 space-y-1 overflow-y-auto">
                                {items.slice(0, 10).map((item) => {
                                    const body = (
                                        <>
                                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                                                {item.title}
                                            </p>
                                            <p className="line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300">
                                                {item.message}
                                            </p>
                                        </>
                                    )
                                    return (
                                        <li key={item.id}>
                                            {item.linkUrl ? (
                                                <Link
                                                    href={item.linkUrl}
                                                    onClick={() => {
                                                        setOpen(false)
                                                        onNavigate?.()
                                                    }}
                                                    className="block rounded-lg px-2 py-1.5 hover:bg-white dark:hover:bg-slate-800"
                                                >
                                                    {body}
                                                </Link>
                                            ) : (
                                                <div className="block rounded-lg px-2 py-1.5">{body}</div>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                            <button
                                type="button"
                                onClick={() => void markAllRead()}
                                className="mt-1 flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
