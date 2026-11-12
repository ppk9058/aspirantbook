"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"

/**
 * Real notification data for the header/profile menus.
 *
 * The API is `GET /api/v1/notifications` (`{ ok: true, data: NotificationItemDto[] }`)
 * and the read state is `PATCH /api/v1/notifications/read`. Nothing here invents
 * items or dots: an anonymous viewer gets an empty list, and the unread count is
 * derived from the rows the server returned.
 */
export interface HeaderNotification {
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
    linkUrl?: string | null
}

export interface UseNotificationsResult {
    items: HeaderNotification[]
    unreadCount: number
    loading: boolean
    error: string | null
    markAllRead: () => Promise<void>
    refresh: () => Promise<void>
}

function sortNewestFirst(items: HeaderNotification[]): HeaderNotification[] {
    return [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function useNotifications(): UseNotificationsResult {
    const { status } = useSession()
    const authenticated = status === "authenticated"
    const [items, setItems] = useState<HeaderNotification[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        if (!authenticated) {
            setItems([])
            setError(null)
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/v1/notifications", {
                cache: "no-store",
                headers: { accept: "application/json" },
            })
            const body = (await res.json().catch(() => null)) as
                | { ok?: boolean; data?: HeaderNotification[] }
                | null
            if (!res.ok || !body?.ok) {
                setError("Could not load notifications")
                return
            }
            setItems(sortNewestFirst(Array.isArray(body.data) ? body.data : []))
        } catch {
            setError("Could not load notifications")
        } finally {
            setLoading(false)
        }
    }, [authenticated])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const markAllRead = useCallback(async () => {
        const unread = items.filter((item) => !item.isRead).map((item) => item.id)
        if (unread.length === 0) return
        setItems((prev) => prev.map((item) => ({ ...item, isRead: true })))
        try {
            const res = await fetch("/api/v1/notifications/read", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ notificationIds: unread }),
            })
            if (!res.ok) {
                setError("Could not mark notifications as read")
                await refresh()
            }
        } catch {
            setError("Could not mark notifications as read")
            await refresh()
        }
    }, [items, refresh])

    return {
        items,
        unreadCount: items.filter((item) => !item.isRead).length,
        loading,
        error,
        markAllRead,
        refresh,
    }
}
